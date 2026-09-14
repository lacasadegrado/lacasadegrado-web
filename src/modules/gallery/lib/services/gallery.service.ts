import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { entitlements, events, photoTags, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { GalleryEvent } from "../types/gallery.types";

/**
 * Every photo tagged with the viewer's email, in active events, grouped
 * by event (newest event first). Explicit column list: `original_key`
 * and `preview_key` are never selected here.
 */
export async function listGalleryForUser(viewer: SessionUser): Promise<GalleryEvent[]> {
  const rows = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      institution: events.institution,
      eventDate: events.eventDate,
      photoId: photos.id,
      width: photos.width,
      height: photos.height,
      priceCents: photos.priceCents,
      owned: sql<boolean>`${entitlements.id} is not null`,
    })
    .from(photoTags)
    .innerJoin(photos, eq(photos.id, photoTags.photoId))
    .innerJoin(events, and(eq(events.id, photos.eventId), eq(events.isActive, true)))
    .leftJoin(
      entitlements,
      and(eq(entitlements.photoId, photos.id), eq(entitlements.profileId, viewer.id)),
    )
    .where(eq(photoTags.email, viewer.email))
        // Newest event first; inside an event, photos already bought come first.
    .orderBy(
      desc(events.eventDate),
      desc(events.createdAt),
      desc(sql`${entitlements.id} is not null`),
      asc(photos.createdAt),
      asc(photos.id),
    );

  const byEvent = new Map<string, GalleryEvent>();
  for (const row of rows) {
    let event = byEvent.get(row.eventId);
    if (!event) {
      event = {
        id: row.eventId,
        name: row.eventName,
        institution: row.institution,
        eventDate: row.eventDate,
        photos: [],
      };
      byEvent.set(row.eventId, event);
    }
    event.photos.push({
      id: row.photoId,
      width: row.width,
      height: row.height,
      priceCents: row.priceCents,
      owned: row.owned,
    });
  }
  return [...byEvent.values()];
}
