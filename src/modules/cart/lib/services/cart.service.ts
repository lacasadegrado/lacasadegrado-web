import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { entitlements, events, photoTags, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { CartItem, CartItemsResult } from "../types/cart.types";

/**
 * Resolves cart ids against what the viewer may actually buy: photos
 * tagged with their email in active events. Prices come from the DB,
 * never from the client (security rule 9). Order of the input is kept.
 */
export async function getCartItemsForUser(
  viewer: SessionUser,
  photoIds: string[],
): Promise<CartItemsResult> {
  if (photoIds.length === 0) return { items: [], unavailableIds: [] };

  const rows = await db
    .select({
      id: photos.id,
      width: photos.width,
      height: photos.height,
      priceCents: photos.priceCents,
      eventName: events.name,
      owned: sql<boolean>`${entitlements.id} is not null`,
    })
    .from(photos)
    .innerJoin(events, and(eq(events.id, photos.eventId), eq(events.isActive, true)))
    .innerJoin(
      photoTags,
      and(eq(photoTags.photoId, photos.id), eq(photoTags.email, viewer.email)),
    )
    .leftJoin(
      entitlements,
      and(eq(entitlements.photoId, photos.id), eq(entitlements.profileId, viewer.id)),
    )
    .where(inArray(photos.id, photoIds));

  const byId = new Map<string, CartItem>(rows.map((row) => [row.id, row]));
  const items: CartItem[] = [];
  const unavailableIds: string[] = [];
  for (const id of photoIds) {
    const item = byId.get(id);
    if (item) items.push(item);
    else unavailableIds.push(id);
  }
  return { items, unavailableIds };
}
