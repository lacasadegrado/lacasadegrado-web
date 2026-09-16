import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/common/lib/db";
import { photos } from "@/common/lib/db/schema";
import {
  deleteObject,
  getObjectBuffer,
  getPresignedPutUrl,
  headObject,
  putObject,
} from "@/common/lib/storage/storage.service";
import { extensionForImageType } from "@/common/lib/utils/mime.util";

import { PHOTO_UPLOAD, STORAGE_PREFIXES } from "../constants/admin.constants";
import { generatePreview } from "./preview.service";

/**
 * Uploads go browser -> R2 directly: a server function never sees the
 * bytes (Vercel caps request bodies at 4.5 MB). The server only hands out
 * a presigned PUT for a key it chose, then, once the browser reports the
 * PUT finished, reads the object back, derives the previews and inserts
 * the row. A `photos` row therefore always has its three objects behind it.
 */

export function originalKeyFor(eventId: string, photoId: string, contentType: string): string {
  return `${STORAGE_PREFIXES.originals}/${eventId}/${photoId}.${extensionForImageType(contentType)}`;
}

type PrepareInput = { eventId: string; contentType: string };

/** Step 1: a fresh id and a URL the browser can PUT the original to. */
export async function prepareUpload(input: PrepareInput): Promise<{ photoId: string; uploadUrl: string }> {
  const photoId = randomUUID();
  const uploadUrl = await getPresignedPutUrl(originalKeyFor(input.eventId, photoId, input.contentType), {
    contentType: input.contentType,
    expiresInSeconds: PHOTO_UPLOAD.uploadUrlTtlSeconds,
  });
  return { photoId, uploadUrl };
}

type CompleteInput = {
  photoId: string;
  eventId: string;
  priceCents: number;
  printPriceCents: number;
  filename: string;
  contentType: string;
};

export type CompleteUploadResult =
  | { ok: true; id: string }
  | { ok: false; reason: "missing" | "too_large" | "wrong_type" | "duplicate" };

/** Step 2: verify what landed in R2, derive previews, insert the row. */
export async function completeUpload(input: CompleteInput): Promise<CompleteUploadResult> {
  const originalKey = originalKeyFor(input.eventId, input.photoId, input.contentType);

  const [existing] = await db
    .select({ id: photos.id })
    .from(photos)
    .where((await import("drizzle-orm")).eq(photos.id, input.photoId))
    .limit(1);
  if (existing) return { ok: false, reason: "duplicate" };

  const info = await headObject(originalKey);
  if (!info) return { ok: false, reason: "missing" };
  if (info.size > PHOTO_UPLOAD.maxBytes) {
    await deleteObject(originalKey);
    return { ok: false, reason: "too_large" };
  }
  if (info.contentType !== input.contentType) {
    await deleteObject(originalKey);
    return { ok: false, reason: "wrong_type" };
  }

  const previewKey = `${STORAGE_PREFIXES.previews}/${input.eventId}/${input.photoId}.webp`;
  const cleanKey = `${STORAGE_PREFIXES.clean}/${input.eventId}/${input.photoId}.webp`;

  try {
    const original = await getObjectBuffer(originalKey);
    const derivative = await generatePreview(original);
    await Promise.all([
      putObject(previewKey, derivative.preview, "image/webp"),
      putObject(cleanKey, derivative.clean, "image/webp"),
    ]);
    await db.insert(photos).values({
      id: input.photoId,
      eventId: input.eventId,
      originalKey,
      previewKey,
      cleanKey,
      originalFilename: input.filename,
      width: derivative.original.width,
      height: derivative.original.height,
      priceCents: input.priceCents,
      printPriceCents: input.printPriceCents,
    });
  } catch (error) {
    // Do not leave orphaned objects if processing or the row failed.
    await Promise.allSettled([
      deleteObject(originalKey),
      deleteObject(previewKey),
      deleteObject(cleanKey),
    ]);
    throw error;
  }

  return { ok: true, id: input.photoId };
}
