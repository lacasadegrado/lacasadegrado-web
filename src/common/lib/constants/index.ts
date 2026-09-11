import { CART_QUERY_KEYS } from "./cart";
import { CHECKOUT_QUERY_KEYS } from "./checkout";

/**
 * Aggregated TanStack Query keys. Each module contributes
 * `<MODULE>_QUERY_KEYS` from `./<module>/index.ts`; nothing inlines a key.
 */
export const QUERY_KEYS = {
  cart: CART_QUERY_KEYS,
  checkout: CHECKOUT_QUERY_KEYS,
} as const;

export { CART_QUERY_KEYS, CHECKOUT_QUERY_KEYS };
