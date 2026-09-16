/**
 * Sets the CORS rule the browser needs to PUT files straight into the R2
 * bucket (photo uploads and payment proofs use presigned URLs).
 *
 *   npm run r2:cors
 *
 * Allows PUT from NEXT_PUBLIC_APP_URL and from http://localhost:3000 for
 * development. Re-run after changing the domain. Reads .env.local.
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const env = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
};
if (!env.accountId || !env.accessKeyId || !env.secretAccessKey || !env.bucket || !env.appUrl) {
  console.error("R2_* and NEXT_PUBLIC_APP_URL must be set in .env.local.");
  process.exit(1);
}

const origins = [...new Set([env.appUrl.replace(/\/$/, ""), "http://localhost:3000"])];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: env.bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["PUT"],
          AllowedHeaders: ["content-type", "cache-control"],
          ExposeHeaders: ["etag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const current = await client.send(new GetBucketCorsCommand({ Bucket: env.bucket }));
console.log(`CORS on bucket ${env.bucket}:`);
console.log(JSON.stringify(current.CORSRules, null, 2));
