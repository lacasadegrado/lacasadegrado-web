import "server-only";

import type { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getServerEnv } from "@/common/lib/config/env.config";

/**
 * Cloudflare R2 through the S3 API. The bucket is private: nothing here
 * ever returns a permanent URL, only short-lived presigned ones, and the
 * caller is responsible for having checked authorization first.
 */

const globalForStorage = globalThis as unknown as { __lcgR2?: S3Client };

function createClient(): S3Client {
  const env = getServerEnv();
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    // R2 does not implement the newer default checksum headers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function getClient(): S3Client {
  if (!globalForStorage.__lcgR2) globalForStorage.__lcgR2 = createClient();
  return globalForStorage.__lcgR2;
}

function bucket(): string {
  return getServerEnv().R2_BUCKET;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Belt and braces: even if a URL leaked, edge caches must not keep it.
      CacheControl: "private, no-store",
    }),
  );
}

/** Streams an object's bytes. For server-side processing and zip building only. */
export async function getObjectStream(key: string): Promise<Readable> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error(`Empty body for ${key}`);
  return result.Body as Readable;
}

/** Buffers a whole object. Use only for images already known to be small. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error(`Empty body for ${key}`);
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

type PresignOptions = {
  /** Seconds the URL stays valid. */
  expiresInSeconds: number;
  /** Sets Content-Disposition on the response, e.g. to force a download. */
  contentDisposition?: string;
};

export async function getPresignedGetUrl(
  key: string,
  { expiresInSeconds, contentDisposition }: PresignOptions,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: contentDisposition,
      ResponseCacheControl: "private, no-store",
    }),
    { expiresIn: expiresInSeconds },
  );
}
