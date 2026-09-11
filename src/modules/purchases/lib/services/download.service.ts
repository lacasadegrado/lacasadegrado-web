import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { downloadLogs, entitlements, events, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

/**
 * SERVER-ONLY RESULTS. These carry storage keys and are consumed only by
 * route handlers that turn them into presigned redirects or streams.
 */

export type EntitledPhotoKeys = {
  photoId: string;
  originalKey: string;
  cleanKey: string | null;
  originalFilename: string;
  eventSlug: string;
};

/** Null unless an entitlements row exists for (viewer, photo). */
export async function getEntitledPhotoKeys(
  viewer: SessionUser,
  photoId: string,
): Promise<EntitledPhotoKeys | null> {
  const [row] = await db
    .select({
      photoId: photos.id,
      originalKey: photos.originalKey,
      cleanKey: photos.cleanKey,
      originalFilename: photos.originalFilename,
      eventSlug: events.slug,
    })
    .from(entitlements)
    .innerJoin(photos, eq(photos.id, entitlements.photoId))
    .innerJoin(events, eq(events.id, photos.eventId))
    .where(and(eq(entitlements.profileId, viewer.id), eq(entitlements.photoId, photoId)))
    .limit(1);
  return row ?? null;
}

/**
 * Keys for an admin, who may see any photo clean. Callers must have
 * checked `isAdminUser` first; this does no authorization of its own.
 */
export async function getPhotoKeysAsAdmin(
  photoId: string,
): Promise<Pick<EntitledPhotoKeys, "cleanKey" | "originalKey"> | null> {
  const [row] = await db
    .select({ cleanKey: photos.cleanKey, originalKey: photos.originalKey })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  return row ?? null;
}

/** Every entitled photo, for the zip. Ordered by event then filename. */
export async function listEntitledPhotoKeys(viewer: SessionUser): Promise<EntitledPhotoKeys[]> {
  return db
    .select({
      photoId: photos.id,
      originalKey: photos.originalKey,
      cleanKey: photos.cleanKey,
      originalFilename: photos.originalFilename,
      eventSlug: events.slug,
    })
    .from(entitlements)
    .innerJoin(photos, eq(photos.id, entitlements.photoId))
    .innerJoin(events, eq(events.id, photos.eventId))
    .where(eq(entitlements.profileId, viewer.id))
    .orderBy(asc(events.eventDate), asc(photos.originalFilename), asc(photos.createdAt));
}

type RequestMeta = { ip: string | null; userAgent: string | null };

/** One row per original handed out (security rule 5). */
export async function recordDownloads(
  viewer: SessionUser,
  photoIds: string[],
  meta: RequestMeta,
): Promise<void> {
  if (photoIds.length === 0) return;
  await db.insert(downloadLogs).values(
    photoIds.map((photoId) => ({
      profileId: viewer.id,
      photoId,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    })),
  );
}
