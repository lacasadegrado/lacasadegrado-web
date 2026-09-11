import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { entitlements, events, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { PurchasedEvent } from "../types/purchases.types";

/**
 * Everything the viewer is entitled to, grouped by event. Entitlements are
 * the only source of truth here (security rule: never derive from orders).
 * Explicit columns: no storage keys.
 */
export async function listPurchasesForUser(viewer: SessionUser): Promise<PurchasedEvent[]> {
  const rows = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      institution: events.institution,
      eventDate: events.eventDate,
      photoId: photos.id,
      width: photos.width,
      height: photos.height,
      originalFilename: photos.originalFilename,
      grantedAt: entitlements.grantedAt,
    })
    .from(entitlements)
    .innerJoin(photos, eq(photos.id, entitlements.photoId))
    .innerJoin(events, eq(events.id, photos.eventId))
    .where(eq(entitlements.profileId, viewer.id))
    .orderBy(desc(events.eventDate), desc(events.createdAt), desc(entitlements.grantedAt));

  const byEvent = new Map<string, PurchasedEvent>();
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
      originalFilename: row.originalFilename,
      grantedAt: row.grantedAt,
    });
  }
  return [...byEvent.values()];
}
