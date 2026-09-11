export const CART_QUERY_KEYS = {
  all: ["cart"] as const,
  items: (photoIds: readonly string[]) => ["cart", "items", [...photoIds].sort()] as const,
} as const;
