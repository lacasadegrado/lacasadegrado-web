import { z } from "zod";

import { orderStatusEnum } from "@/common/lib/db/schema/enums.table";

/**
 * Ventas filters as they come in the query string
 * (`?status=&event=&q=&page=`). Approved sales unless asked otherwise;
 * a bad value just falls back instead of erroring.
 */
export const salesFiltersSchema = z.object({
  status: z.enum([...orderStatusEnum.enumValues, "all"]).catch("paid"),
  event: z.uuid().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type SalesSearchParams = z.infer<typeof salesFiltersSchema>;
