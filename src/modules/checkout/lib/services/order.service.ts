import "server-only";

import { db } from "@/common/lib/db";
import { orderItems, orders, type PaymentMethod } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";
import { getCartItemsForUser } from "@/modules/cart/lib/services/cart.service";

import type { CheckoutQuote, CreateOrderResult } from "../types/checkout.types";
import { getCurrentRate } from "./exchange-rate.service";

/** Everything the checkout screen shows, computed from the DB. */
export async function getCheckoutQuote(
  viewer: SessionUser,
  photoIds: string[],
): Promise<CheckoutQuote> {
  const [{ items, unavailableIds }, rate] = await Promise.all([
    getCartItemsForUser(viewer, photoIds),
    getCurrentRate(),
  ]);
  const buyable = items.filter((item) => !item.owned);
  const subtotalCents = buyable.reduce((sum, item) => sum + item.priceCents, 0);
  return { items, unavailableIds, subtotalCents, totalCents: subtotalCents, rate };
}

/**
 * Creates a `pending_payment` order. Totals are recomputed here from
 * `photos.price_cents` (security rule 9) and the exchange rate is
 * snapshotted. Refuses if any requested photo is not purchasable, so the
 * client can show exactly which ones and prune them.
 */
export async function createOrder(
  viewer: SessionUser,
  photoIds: string[],
  paymentMethod: PaymentMethod,
): Promise<CreateOrderResult> {
  if (photoIds.length === 0) return { ok: false, reason: "empty" };

  const { items, unavailableIds } = await getCartItemsForUser(viewer, photoIds);
  const owned = items.filter((item) => item.owned).map((item) => item.id);
  const blocked = [...unavailableIds, ...owned];
  if (blocked.length > 0) return { ok: false, reason: "unavailable", unavailableIds: blocked };

  const rate = await getCurrentRate();
  if (!rate) return { ok: false, reason: "no_rate" };

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);

  const orderId = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        profileId: viewer.id,
        status: "pending_payment",
        paymentMethod,
        subtotalCents,
        totalCents: subtotalCents,
        currency: "USD",
        exchangeRate: rate.usdToVes.toFixed(4),
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        photoId: item.id,
        unitPriceCents: item.priceCents,
      })),
    );

    return order.id;
  });

  return { ok: true, orderId };
}
