"use server";

import type { PaymentMethod } from "@/common/lib/db/schema";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { cartLinesSchema } from "@/modules/cart/lib/schemas/cart.schema";
import type { CartLineInput } from "@/modules/cart/lib/types/cart.types";

import { CHECKOUT_PATHS } from "../constants/checkout.constants";
import { createOrderSchema } from "../schemas/checkout.schema";
import { createOrder, getCheckoutQuote } from "../services/order.service";
import type { CheckoutQuote, CreateOrderResult } from "../types/checkout.types";

export async function getCheckoutQuoteAction(lines: CartLineInput[]): Promise<CheckoutQuote> {
  const user = await requireSessionUser(CHECKOUT_PATHS.checkout);
  const parsed = cartLinesSchema.safeParse(lines);
  if (!parsed.success) {
    return {
      items: [],
      unavailableIds: lines.map((line) => line.photoId),
      subtotalCents: 0,
      totalCents: 0,
      printCount: 0,
      rate: null,
    };
  }
  return getCheckoutQuote(user, parsed.data);
}

export async function createOrderAction(input: {
  lines: CartLineInput[];
  paymentMethod: string;
  acceptTerms: boolean;
}): Promise<CreateOrderResult> {
  const user = await requireSessionUser(CHECKOUT_PATHS.checkout);
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: input.acceptTerms === true ? "empty" : "terms" };
  }
  return createOrder(user, parsed.data.lines, parsed.data.paymentMethod as PaymentMethod);
}
