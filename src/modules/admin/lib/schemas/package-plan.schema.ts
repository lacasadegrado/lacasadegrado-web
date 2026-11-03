import { z } from "zod";

/**
 * Abonos filters in the query string (`?event=&status=&q=&page=`). Open
 * plans (still owe money) by default; `all` shows paid ones too.
 */
export const packagePlanFiltersSchema = z.object({
  event: z.uuid().optional().catch(undefined),
  status: z.enum(["open", "paid", "all"]).catch("open"),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type PackagePlanSearchParams = z.infer<typeof packagePlanFiltersSchema>;
