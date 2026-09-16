export const CART_PATHS = {
  cart: "/cart",
  checkout: "/checkout",
} as const;

/** localStorage key for the persisted cart. Bumped to v2 when lines gained a format. */
export const CART_STORAGE_KEY = "lcg-cart-v2";

/** Sanity cap; nobody buys more than this in one order. */
export const CART_MAX_ITEMS = 200;
