/**
 * Deletes files uploaded through a public form that no submission uses:
 * people who attached a proof and never sent the form, or replaced it.
 *
 *   npm run forms:cleanup                 # dry run: lists what would go
 *   npm run forms:cleanup -- --yes        # deletes
 *   npm run forms:cleanup -- --hours 48   # only files older than 48 h (default 24)
 *   --hours 0 takes every unused file, including a form someone is filling now.
 *
 * A file is kept when any submission's answers mention its key (proofs and
 * any other file question) or when it is younger than --hours, so someone
 * filling the form right now never loses their upload.
 *
 * Reads DATABASE_URL and the R2_* values from .env.local.
 */
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const PREFIX = "forms/";
const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const hoursIndex = args.indexOf("--hours");
const hours = hoursIndex >= 0 ? Number(args[hoursIndex + 1]) : 24;
if (!Number.isFinite(hours) || hours < 0) {
  console.error("--hours must be a number, 0 or more.");
  process.exit(1);
}
if (hours === 0) console.warn("--hours 0: an upload from a form being filled right now counts as unused.");

const url = process.env.DATABASE_URL;
const r2 = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};
if (!url || !r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucket) {
  console.error("DATABASE_URL and the R2_* variables must be set in .env.local.");
  process.exit(1);
}

/** Every `key` string under the forms prefix anywhere in an answers object. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into);
  } else if (value && typeof value === "object") {
    for (const [name, inner] of Object.entries(value)) {
      if (name === "key" && typeof inner === "string" && inner.startsWith(PREFIX)) into.add(inner);
      else collectKeys(inner, into);
    }
  }
}

const sql = postgres(url, { prepare: false, max: 1 });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

try {
  const referenced = new Set<string>();
  const rows = await sql<{ answers: unknown; proof_key: string }[]>`
    select answers, proof_key from form_submissions`;
  for (const row of rows) {
    referenced.add(row.proof_key);
    collectKeys(row.answers, referenced);
  }

  const objects: { key: string; size: number; lastModified: Date | null }[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: r2.bucket, Prefix: PREFIX, ContinuationToken: token }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) objects.push({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified ?? null });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const orphans = objects.filter(
    (object) =>
      !referenced.has(object.key) && object.lastModified !== null && object.lastModified.getTime() < cutoff,
  );
  const recent = objects.filter(
    (object) => !referenced.has(object.key) && (object.lastModified?.getTime() ?? Date.now()) >= cutoff,
  ).length;
  const megabytes = orphans.reduce((acc, object) => acc + object.size, 0) / 1024 / 1024;

  console.log(`Submissions: ${rows.length}, files they use: ${referenced.size}`);
  console.log(`Files under ${PREFIX}: ${objects.length}`);
  console.log(`Unused and older than ${hours} h: ${orphans.length} (${megabytes.toFixed(2)} MB)`);
  console.log(`Unused but recent (kept, may be a form in progress): ${recent}`);
  for (const object of orphans.slice(0, 20)) console.log(`  ${object.key}`);
  if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);

  if (!confirmed) {
    console.log("\nDry run. Nothing was deleted. Re-run with --yes to delete.");
  } else if (orphans.length > 0) {
    let deleted = 0;
    for (let start = 0; start < orphans.length; start += 1000) {
      const batch = orphans.slice(start, start + 1000).map((object) => object.key);
      const result = await s3.send(
        new DeleteObjectsCommand({ Bucket: r2.bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
      );
      deleted += batch.length - (result.Errors?.length ?? 0);
      for (const error of result.Errors ?? []) console.error(`  failed: ${error.Key} (${error.Code})`);
    }
    console.log(`\nDeleted ${deleted} of ${orphans.length} files.`);
  }
} finally {
  await sql.end();
}
