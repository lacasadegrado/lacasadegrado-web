/**
 * Wipes every customer-facing record so the database can start fresh,
 * keeping one account (the admin) and the exchange-rate history.
 *
 *   npm run db:purge -- --keep correo@dominio.com --yes [--rates]
 *
 * Deletes, in dependency order: download logs, entitlements, payments,
 * order items, orders, photo tags, photos, events, support messages, OTP
 * attempts, and every auth user except the kept one (profiles cascade).
 * Then removes the R2 objects those photos and payment proofs pointed at.
 * Without --yes it only prints what would be deleted. --rates also wipes
 * the exchange-rate history (e.g. after changing the base currency).
 *
 * Reads DATABASE_URL and the R2_* values from .env.local.
 */
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const args = process.argv.slice(2);
const keepIndex = args.indexOf("--keep");
const keepEmail = keepIndex >= 0 ? args[keepIndex + 1]?.trim().toLowerCase() : undefined;
const confirmed = args.includes("--yes");
const wipeRates = args.includes("--rates");

if (!keepEmail) {
  console.error("Usage: tsx scripts/purge-data.mts --keep <email> [--yes]");
  process.exit(1);
}

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

const sql = postgres(url, { prepare: false, max: 1 });

try {
  const [keep] = await sql<{ id: string; email: string }[]>`
    select u.id, u.email from auth.users u where lower(u.email) = ${keepEmail}`;
  if (!keep) {
    console.error(`No auth user found for ${keepEmail}. Nothing was deleted.`);
    process.exit(1);
  }

  const [counts] = await sql<Record<string, number>[]>`select
    (select count(*) from auth.users where id <> ${keep.id})::int as users,
    (select count(*) from events)::int as events,
    (select count(*) from photos)::int as photos,
    (select count(*) from orders)::int as orders,
    (select count(*) from payments)::int as payments,
    (select count(*) from entitlements)::int as entitlements,
    (select count(*) from download_logs)::int as download_logs,
    (select count(*) from support_messages)::int as support_messages,
    (select count(*) from otp_attempts)::int as otp_attempts,
    (select count(*) from exchange_rates)::int as exchange_rates`;

  const photoKeys = await sql<{ k: string }[]>`
    select original_key as k from photos
    union all select preview_key from photos where preview_key is not null
    union all select clean_key from photos where clean_key is not null`;
  const proofKeys = await sql<{ k: string }[]>`
    select proof_key as k from payments where proof_key is not null`;
  const objectKeys = [...photoKeys, ...proofKeys].map((row) => row.k);

  console.log(`Keeping ${keep.email} (${keep.id})${wipeRates ? "" : " and the exchange-rate history"}.`);
  console.log("Rows to delete:", counts);
  console.log(`R2 objects to delete: ${objectKeys.length}`);

  if (!confirmed) {
    console.log("Dry run. Add --yes to delete.");
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    await tx`delete from download_logs`;
    await tx`delete from entitlements`;
    await tx`delete from payments`;
    await tx`delete from order_items`;
    await tx`delete from orders`;
    await tx`delete from photo_tags`;
    await tx`delete from photos`;
    await tx`delete from events`;
    await tx`delete from support_messages`;
    await tx`delete from otp_attempts`;
    if (wipeRates) await tx`delete from exchange_rates`;
    // profiles cascade from auth.users; exchange_rates.created_by is set null.
    await tx`delete from auth.users where id <> ${keep.id}`;
    await tx`update profiles set is_admin = true, free_view = false, free_download = false, role_label = null where id = ${keep.id}`;
  });
  console.log("Database purged.");

  if (objectKeys.length > 0) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    let deleted = 0;
    for (let i = 0; i < objectKeys.length; i += 1000) {
      const batch = objectKeys.slice(i, i + 1000);
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: r2.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      deleted += batch.length - (result.Errors?.length ?? 0);
      for (const error of result.Errors ?? []) {
        console.error(`R2 could not delete ${error.Key}: ${error.Message}`);
      }
    }
    console.log(`R2 objects deleted: ${deleted}/${objectKeys.length}`);
  }
} finally {
  await sql.end();
}
