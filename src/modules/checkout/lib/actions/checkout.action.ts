"use server";

import type { PaymentMethod } from "@/common/lib/db/schema";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { photoIdListSchema } from "@/modules/cart/lib/schemas/cart.schema";

import { CHECKOUT_PATHS } from "../constants/checkout.constants";
import { createOrderSchema } from "../schemas/checkout.schema";
import { createOrder, getCheckoutQuote } from "../services/order.service";
import type { CheckoutQuote, CreateOrderResult } from "../types/checkout.types";

export async function getCheckoutQuoteAction(photoIds: string[]): Promise<CheckoutQuote> {
  const user = await requireSessionUser(CHECKOUT_PATHS.checkout);
  const parsed = photoIdListSchema.safeParse(photoIds);
  if (!parsed.success) {
    return { items: [], unavailableIds: photoIds, subtotalCents: 0, totalCents: 0, rate: null };
  }
  return getCheckoutQuote(user, parsed.data);
}

export async function createOrderAction(input: {
  photoIds: string[];
  paymentMethod: string;
}): Promise<CreateOrderResult> {
  const user = await requireSessionUser(CHECKOUT_PATHS.checkout);
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "empty" };
  return createOrder(user, parsed.data.photoIds, parsed.data.paymentMethod as PaymentMethod);
}
