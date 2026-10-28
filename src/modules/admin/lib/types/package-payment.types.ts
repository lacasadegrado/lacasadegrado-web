import type { FormKind } from "@/common/lib/db/schema";
import type { FormField, FormFieldType } from "@/modules/forms/lib/types/form.types";

export type PackagePaymentFilters = {
  eventId?: string;
  formId?: string;
  packageId?: string;
  /** Pagos › Paquetes only lists payment forms; a general form's page passes "general". */
  kind?: FormKind;
  /** Matches email or reference, case-insensitive. */
  query?: string;
};

/**
 * One submission in a list. The system values are null when the form has
 * no such field (general forms) or it was left empty (made optional).
 */
export type PackagePaymentRow = {
  id: string;
  submittedAt: Date;
  email: string | null;
  reference: string | null;
  packageName: string | null;
  packagePriceCents: number | null;
  /** From the field marked as the person's name, when there is one. */
  personName: string | null;
  /** Whether a proof file was attached. The key itself never leaves the server. */
  hasProof: boolean;
  formKind: FormKind;
  formId: string;
  formTitle: string;
  eventName: string;
};

/** Per-package totals; null name and price group the answers with no package chosen. */
export type PackagePaymentSummary = {
  packageName: string | null;
  priceCents: number | null;
  count: number;
  totalCents: number;
};

/** A file of an answer, addressed by field and position. Never the R2 key. */
export type PackagePaymentFile = { index: number; name: string; isImage: boolean };

export type PackagePaymentAnswer = {
  fieldId: string;
  label: string;
  type: FormFieldType;
  /** Human-readable value; null when the person left it empty. */
  text: string | null;
  files: PackagePaymentFile[];
};

export type PackagePaymentDetail = PackagePaymentRow & {
  eventId: string;
  formVersion: number;
  answers: PackagePaymentAnswer[];
};

/** A submission with its raw answers and the fields it was sent with. */
export type PackagePaymentExportRow = PackagePaymentRow & {
  answers: Record<string, unknown>;
  fields: FormField[];
};
