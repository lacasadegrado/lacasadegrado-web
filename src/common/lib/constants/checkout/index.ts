type CheckoutKeyLine = { photoId: string; format: string };

export const CHECKOUT_QUERY_KEYS = {
  all: ["checkout"] as const,
  quote: (lines: readonly CheckoutKeyLine[]) =>
    ["checkout", "quote", lines.map((line) => `${line.photoId}:${line.format}`).sort()] as const,
} as const;
