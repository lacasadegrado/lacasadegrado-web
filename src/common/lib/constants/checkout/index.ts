export const CHECKOUT_QUERY_KEYS = {
  all: ["checkout"] as const,
  quote: (photoIds: readonly string[]) =>
    ["checkout", "quote", [...photoIds].sort()] as const,
} as const;
