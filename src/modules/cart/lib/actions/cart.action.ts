"use server";

import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { CART_PATHS } from "../constants/cart.constants";
import { photoIdListSchema } from "../schemas/cart.schema";
import { getCartItemsForUser } from "../services/cart.service";
import type { CartItemsResult } from "../types/cart.types";

/** Called from the client through TanStack Query to hydrate cart lines. */
export async function fetchCartItemsAction(photoIds: string[]): Promise<CartItemsResult> {
  const user = await requireSessionUser(CART_PATHS.cart);
  const parsed = photoIdListSchema.safeParse(photoIds);
  if (!parsed.success) return { items: [], unavailableIds: photoIds };
  return getCartItemsForUser(user, parsed.data);
}
