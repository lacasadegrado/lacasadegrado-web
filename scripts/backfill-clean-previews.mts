/**
 * One-off: generates the clean (unblurred, unwatermarked) 1400px WebP for
 * photos ingested before `clean_key` existed.
 *
 *   npm run photos:backfill-clean
 *
 * Reads R2 and DATABASE_URL settings from .env.local. Idempotent: only
 * touches rows where clean_key is null.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import sharp from "sharp";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const env = process.env;
for (const key of ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
  if (!env[key]) {
    console.error(`${key} is not set.`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = env.R2_BUCKET!;
const sql = postgres(env.DATABASE_URL!, { prepare: false, max: 1 });

try {
  const rows = await sql<{ id: string; event_id: string; original_key: string }[]>`
    select id, event_id, original_key from photos where clean_key is null order by created_at`;
  console.log(`${rows.length} photo(s) to backfill`);

  for (const row of rows) {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: row.original_key }));
    const original = Buffer.from(await object.Body!.transformToByteArray());
    const clean = await sharp(original, { failOn: "none" })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const cleanKey = `clean/${row.event_id}/${row.id}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
        Body: clean,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
    );
    await sql`update photos set clean_key = ${cleanKey} where id = ${row.id}`;
    console.log(`ok ${row.id} (${Math.round(clean.length / 1024)} KB)`);
  }
} finally {
  await sql.end();
}
