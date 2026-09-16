import { z } from "zod";

import { PHOTO_FORMATS } from "@/common/lib/constants/catalog";

import { CART_MAX_ITEMS } from "../constants/cart.constants";

const cartLineSchema = z.object({
  photoId: z.uuid(),
  format: z.enum(PHOTO_FORMATS as [string, ...string[]]).transform((f) => f as "digital" | "print"),
});

/** One line per photo: a later duplicate of the same photo is dropped. */
export const cartLinesSchema = z
  .array(cartLineSchema)
  .max(CART_MAX_ITEMS)
  .transform((lines) => {
    const seen = new Set<string>();
    return lines.filter((line) => {
      if (seen.has(line.photoId)) return false;
      seen.add(line.photoId);
      return true;
    });
  });
