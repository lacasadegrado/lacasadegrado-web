import "server-only";

import { and, eq, exists } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { photoTags, photos } from "@/common/lib/db/schema";
import { isAdminUser } from "@/modules/admin/lib/services/admin-access.service";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

/**
 * Returns the preview storage key only if the viewer may see it: a
 * `photo_tags` row for their email, or an admin. Never selects
 * `original_key`.
 */
export async function getPreviewKeyForViewer(
  viewer: SessionUser,
  photoId: string,
): Promise<string | null> {
  const taggedForViewer = exists(
    db
      .select({ one: photoTags.id })
      .from(photoTags)
      .where(and(eq(photoTags.photoId, photos.id), eq(photoTags.email, viewer.email))),
  );

  const [row] = await db
    .select({ previewKey: photos.previewKey })
    .from(photos)
    .where(and(eq(photos.id, photoId), taggedForViewer))
    .limit(1);
  if (row) return row.previewKey;

  if (!(await isAdminUser(viewer.id))) return null;

  const [adminRow] = await db
    .select({ previewKey: photos.previewKey })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  return adminRow?.previewKey ?? null;
}
