import { z } from "zod";

import { CART_MAX_ITEMS } from "../constants/cart.constants";

export const photoIdListSchema = z
  .array(z.uuid())
  .max(CART_MAX_ITEMS)
  .transform((ids) => [...new Set(ids)]);
