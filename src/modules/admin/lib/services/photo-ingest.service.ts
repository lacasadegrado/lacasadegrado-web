import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/common/lib/db";
import { photos } from "@/common/lib/db/schema";
import { deleteObject, putObject } from "@/common/lib/storage/storage.service";
import { extensionForImageType } from "@/common/lib/utils/mime.util";

import { STORAGE_PREFIXES } from "../constants/admin.constants";
import { generatePreview } from "./preview.service";

type IngestInput = {
  eventId: string;
  priceCents: number;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

/**
 * Original goes to R2 untouched; the blurred, watermarked preview is
 * generated here and stored beside it. Only then is the row inserted, so
 * a `photos` row always has both objects behind it.
 */
export async function ingestPhoto(input: IngestInput): Promise<{ id: string }> {
  const derivative = await generatePreview(input.buffer);

  const id = randomUUID();
  const extension = extensionForImageType(input.contentType);
  const originalKey = `${STORAGE_PREFIXES.originals}/${input.eventId}/${id}.${extension}`;
  const previewKey = `${STORAGE_PREFIXES.previews}/${input.eventId}/${id}.webp`;
  const cleanKey = `${STORAGE_PREFIXES.clean}/${input.eventId}/${id}.webp`;

  await Promise.all([
    putObject(originalKey, input.buffer, input.contentType),
    putObject(previewKey, derivative.preview, "image/webp"),
    putObject(cleanKey, derivative.clean, "image/webp"),
  ]);

  try {
    await db.insert(photos).values({
      id,
      eventId: input.eventId,
      originalKey,
      previewKey,
      cleanKey,
      originalFilename: input.filename,
      width: derivative.original.width,
      height: derivative.original.height,
      priceCents: input.priceCents,
    });
  } catch (error) {
    // Do not leave orphaned objects if the row could not be written.
    await Promise.allSettled([
      deleteObject(originalKey),
      deleteObject(previewKey),
      deleteObject(cleanKey),
    ]);
    throw error;
  }

  return { id };
}
