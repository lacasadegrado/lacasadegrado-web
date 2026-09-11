import "server-only";

import { asc, count, eq, inArray } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { orderItems, photoTags, photos } from "@/common/lib/db/schema";
import { deleteObject } from "@/common/lib/storage/storage.service";

import type { AdminPhoto, BulkTagResult } from "../types/admin.types";
import { filenameKey, type TagCsvRow } from "../utils/tag-csv.util";

/**
 * Admin listing. Selects explicit columns: `original_key` is not among
 * them and must never be (security rule 3).
 */
export async function listPhotosForEvent(eventId: string): Promise<AdminPhoto[]> {
  const rows = await db
    .select({
      id: photos.id,
      originalFilename: photos.originalFilename,
      width: photos.width,
      height: photos.height,
      priceCents: photos.priceCents,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(eq(photos.eventId, eventId))
    .orderBy(asc(photos.originalFilename), asc(photos.createdAt));

  if (rows.length === 0) return [];

  const tags = await db
    .select({ id: photoTags.id, photoId: photoTags.photoId, email: photoTags.email })
    .from(photoTags)
    .where(
      inArray(
        photoTags.photoId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(photoTags.email));

  const tagsByPhoto = new Map<string, AdminPhoto["tags"]>();
  for (const tag of tags) {
    const list = tagsByPhoto.get(tag.photoId) ?? [];
    list.push({ id: tag.id, email: tag.email });
    tagsByPhoto.set(tag.photoId, list);
  }

  return rows.map((row) => ({ ...row, tags: tagsByPhoto.get(row.id) ?? [] }));
}

/** Future orders only: existing order_items keep their snapshot price. */
export async function updatePhotoPrice(photoId: string, priceCents: number): Promise<boolean> {
  const updated = await db
    .update(photos)
    .set({ priceCents })
    .where(eq(photos.id, photoId))
    .returning({ id: photos.id });
  return updated.length > 0;
}

export type DeletePhotoResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "has_orders" };

/**
 * Removes the row (tags cascade) and then the three R2 objects. A photo
 * that appears in any order, paid or not, cannot be deleted: the buyer's
 * entitlement and the order history depend on it.
 */
export async function deletePhoto(photoId: string): Promise<DeletePhotoResult> {
  const [photo] = await db
    .select({
      id: photos.id,
      originalKey: photos.originalKey,
      previewKey: photos.previewKey,
      cleanKey: photos.cleanKey,
    })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  if (!photo) return { ok: false, reason: "not_found" };

  const [usage] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.photoId, photoId));
  if ((usage?.total ?? 0) > 0) return { ok: false, reason: "has_orders" };

  await db.delete(photos).where(eq(photos.id, photoId));

  const keys = [photo.originalKey, photo.previewKey, photo.cleanKey].filter(
    (key): key is string => Boolean(key),
  );
  const results = await Promise.allSettled(keys.map((key) => deleteObject(key)));
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error("[admin] orphaned object after photo delete", { key: keys[index] });
    }
  }
  return { ok: true };
}

export async function addTag(photoId: string, email: string): Promise<{ created: boolean }> {
  const inserted = await db
    .insert(photoTags)
    .values({ photoId, email })
    .onConflictDoNothing({ target: [photoTags.photoId, photoTags.email] })
    .returning({ id: photoTags.id });
  return { created: inserted.length > 0 };
}

export async function removeTag(tagId: string): Promise<void> {
  await db.delete(photoTags).where(eq(photoTags.id, tagId));
}

/**
 * Matches each CSV filename against the event's photos (case-insensitive,
 * extension optional) and tags them. Reports what did not match so the
 * admin can fix the sheet rather than guess.
 */
export async function bulkTagByFilename(
  eventId: string,
  rows: TagCsvRow[],
  invalidLines: BulkTagResult["invalidLines"],
): Promise<BulkTagResult> {
  const eventPhotos = await db
    .select({ id: photos.id, originalFilename: photos.originalFilename })
    .from(photos)
    .where(eq(photos.eventId, eventId));

  const idByKey = new Map<string, string>();
  for (const photo of eventPhotos) {
    idByKey.set(filenameKey(photo.originalFilename), photo.id);
  }

  const values: { photoId: string; email: string }[] = [];
  const unmatched = new Set<string>();
  for (const row of rows) {
    const photoId = idByKey.get(filenameKey(row.filename));
    if (!photoId) {
      unmatched.add(row.filename);
      continue;
    }
    values.push({ photoId, email: row.email });
  }

  let added = 0;
  if (values.length > 0) {
    const inserted = await db
      .insert(photoTags)
      .values(values)
      .onConflictDoNothing({ target: [photoTags.photoId, photoTags.email] })
      .returning({ id: photoTags.id });
    added = inserted.length;
  }

  return {
    added,
    alreadyTagged: values.length - added,
    unmatchedFilenames: [...unmatched],
    invalidLines,
  };
}
