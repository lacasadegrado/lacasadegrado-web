import { z } from "zod";

/** A bad value in the URL just drops that filter instead of erroring. */
const optionalId = z.uuid().optional().catch(undefined);

/**
 * Filters as they come in the query string (`?event=&form=&package=&q=&page=`),
 * shared by the list page and the Excel export so both show the same rows.
 */
export const packagePaymentFiltersSchema = z.object({
  event: optionalId,
  form: optionalId,
  package: optionalId,
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type PackagePaymentSearchParams = z.infer<typeof packagePaymentFiltersSchema>;

export function toPackagePaymentFilters(params: PackagePaymentSearchParams) {
  return {
    eventId: params.event,
    formId: params.form,
    packageId: params.package,
    query: params.q || undefined,
  };
}

export const packagePaymentFileParamsSchema = z.object({
  id: z.uuid(),
  fieldId: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  index: z.coerce.number().int().min(0).max(20),
});
