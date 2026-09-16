type CartKeyLine = { photoId: string; format: string };

/** Stable key regardless of line order. */
function lineKeys(lines: readonly CartKeyLine[]): string[] {
  return lines.map((line) => `${line.photoId}:${line.format}`).sort();
}

export const CART_QUERY_KEYS = {
  all: ["cart"] as const,
  items: (lines: readonly CartKeyLine[]) => ["cart", "items", lineKeys(lines)] as const,
} as const;
