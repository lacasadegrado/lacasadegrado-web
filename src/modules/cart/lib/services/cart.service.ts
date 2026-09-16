import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { entitlements, events, photoTags, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { CartItem, CartItemsResult, CartLineInput } from "../types/cart.types";

/**
 * Resolves cart lines against what the viewer may actually buy: photos
 * tagged with their email in active events. Prices come from the DB,
 * never from the client (security rule 9); the client only chooses the
 * format. Order of the input is kept.
 */
export async function getCartItemsForUser(
  viewer: SessionUser,
  lines: CartLineInput[],
): Promise<CartItemsResult> {
  if (lines.length === 0) return { items: [], unavailableIds: [] };

  const rows = await db
    .select({
      id: photos.id,
      width: photos.width,
      height: photos.height,
      priceCents: photos.priceCents,
      printPriceCents: photos.printPriceCents,
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
    .where(
      inArray(
        photos.id,
        lines.map((line) => line.photoId),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const items: CartItem[] = [];
  const unavailableIds: string[] = [];
  for (const line of lines) {
    const row = byId.get(line.photoId);
    if (!row) {
      unavailableIds.push(line.photoId);
      continue;
    }
    items.push({
      ...row,
      format: line.format,
      unitPriceCents: line.format === "print" ? row.printPriceCents : row.priceCents,
    });
  }
  return { items, unavailableIds };
}
