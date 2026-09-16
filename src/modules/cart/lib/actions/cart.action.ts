"use server";

import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { CART_PATHS } from "../constants/cart.constants";
import { cartLinesSchema } from "../schemas/cart.schema";
import { getCartItemsForUser } from "../services/cart.service";
import type { CartItemsResult, CartLineInput } from "../types/cart.types";

/** Called from the client through TanStack Query to hydrate cart lines. */
export async function fetchCartItemsAction(lines: CartLineInput[]): Promise<CartItemsResult> {
  const user = await requireSessionUser(CART_PATHS.cart);
  const parsed = cartLinesSchema.safeParse(lines);
  if (!parsed.success) return { items: [], unavailableIds: lines.map((line) => line.photoId) };
  return getCartItemsForUser(user, parsed.data);
}
