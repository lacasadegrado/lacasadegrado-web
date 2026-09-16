import "server-only";

import { db } from "@/common/lib/db";
import { orderItems, orders, type PaymentMethod } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";
import { getCartItemsForUser } from "@/modules/cart/lib/services/cart.service";
import type { CartLineInput } from "@/modules/cart/lib/types/cart.types";
import { TERMS_VERSION } from "@/modules/legal/lib/constants/legal.constants";

import type { CheckoutQuote, CreateOrderResult } from "../types/checkout.types";
import { getCurrentRate } from "./exchange-rate.service";

/** Everything the checkout screen shows, computed from the DB. */
export async function getCheckoutQuote(
  viewer: SessionUser,
  lines: CartLineInput[],
): Promise<CheckoutQuote> {
  const [{ items, unavailableIds }, rate] = await Promise.all([
    getCartItemsForUser(viewer, lines),
    getCurrentRate(),
  ]);
  const buyable = items.filter((item) => !item.owned);
  const subtotalCents = buyable.reduce((sum, item) => sum + item.unitPriceCents, 0);
  const printCount = buyable.filter((item) => item.format === "print").length;
  return { items, unavailableIds, subtotalCents, totalCents: subtotalCents, printCount, rate };
}

/**
 * Creates a `pending_payment` order. Totals are recomputed here from
 * `photos.price_cents` / `print_price_cents` for the chosen format
 * (security rule 9) and the exchange rate is snapshotted. Refuses if any
 * requested photo is not purchasable, so the client can show exactly
 * which ones and prune them. The caller has already validated that the
 * person accepted the terms; the version they saw is stamped here.
 */
export async function createOrder(
  viewer: SessionUser,
  lines: CartLineInput[],
  paymentMethod: PaymentMethod,
): Promise<CreateOrderResult> {
  if (lines.length === 0) return { ok: false, reason: "empty" };

  const { items, unavailableIds } = await getCartItemsForUser(viewer, lines);
  const owned = items.filter((item) => item.owned).map((item) => item.id);
  const blocked = [...unavailableIds, ...owned];
  if (blocked.length > 0) return { ok: false, reason: "unavailable", unavailableIds: blocked };

  const rate = await getCurrentRate();
  if (!rate) return { ok: false, reason: "no_rate" };

  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents, 0);
  const hasPrints = items.some((item) => item.format === "print");

  const orderId = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        profileId: viewer.id,
        status: "pending_payment",
        paymentMethod,
        subtotalCents,
        totalCents: subtotalCents,
        currency: "EUR",
        exchangeRate: rate.eurToVes.toFixed(4),
        printStatus: hasPrints ? "pending" : null,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        photoId: item.id,
        format: item.format,
        unitPriceCents: item.unitPriceCents,
      })),
    );

    return order.id;
  });

  return { ok: true, orderId };
}
