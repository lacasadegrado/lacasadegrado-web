import type { FormKind } from "@/common/lib/db/schema";

import { ADMIN_PATHS } from "../constants/admin.constants";

/**
 * Where a form's answers live: payment forms in Pagos › Paquetes (filtered
 * to that form), general forms on their own page under Formularios.
 */
export function formResponsesHref(form: { id: string; kind: FormKind; eventId: string }): string {
  return form.kind === "package_payment"
    ? `${ADMIN_PATHS.packagePayments}?event=${form.eventId}&form=${form.id}`
    : ADMIN_PATHS.formResponses(form.id);
}

/** One submission's detail page: under Pagos for payment forms, under the form otherwise. */
export function submissionHref(row: { id: string; formId: string; formKind: FormKind }): string {
  return row.formKind === "package_payment"
    ? ADMIN_PATHS.packagePayment(row.id)
    : ADMIN_PATHS.formResponse(row.formId, row.id);
}
