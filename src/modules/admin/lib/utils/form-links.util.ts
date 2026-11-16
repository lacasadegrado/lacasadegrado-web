import type { FormKind } from "@/common/lib/db/schema";

import { ADMIN_PATHS } from "../constants/admin.constants";

/**
 * Where a form's answers live: on its own page under Formularios. For a
 * package form those are the sign-ups; its payments are in Pagos › Paquetes
 * (`formPaymentsHref`).
 */
export function formResponsesHref(form: { id: string }): string {
  return ADMIN_PATHS.formResponses(form.id);
}

/** A package form's payments, in Pagos › Paquetes filtered to that form. */
export function formPaymentsHref(form: { id: string; eventId: string }): string {
  return `${ADMIN_PATHS.packagePayments}?event=${form.eventId}&form=${form.id}`;
}

/** A package payment (has a review status) vs an answer (general form or package sign-up). */
export function isPaymentSubmission(row: { formKind: FormKind; paymentStatus: unknown }): boolean {
  return row.formKind === "package_payment" && row.paymentStatus !== null;
}

/** One submission's detail page: under Pagos for payments, under the form otherwise. */
export function submissionHref(row: {
  id: string;
  formId: string;
  formKind: FormKind;
  paymentStatus: unknown;
}): string {
  return isPaymentSubmission(row) ? ADMIN_PATHS.packagePayment(row.id) : ADMIN_PATHS.formResponse(row.formId, row.id);
}
