import type { FormKind, PackagePaymentStatus } from "@/common/lib/db/schema";
import type { FormField, FormFieldType } from "@/modules/forms/lib/types/form.types";

export type PackagePaymentFilters = {
  eventId?: string;
  formId?: string;
  packageId?: string;
  /** Pagos › Paquetes only lists payment forms; a general form's page passes "general". */
  kind?: FormKind;
  /** Matches email or reference, case-insensitive. */
  query?: string;
  /** Review status of package payments. */
  paymentStatus?: PackagePaymentStatus;
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
  /** Payment fields: null on general forms. */
  paymentStatus: PackagePaymentStatus | null;
  /** EUR cents of this payment; null on answers sent before abonos existed. */
  amountCents: number | null;
  installmentsCovered: number | null;
  /** The plan's parts, for "1 of 3". */
  planInstallments: number | null;
  planId: string | null;
  eurToVes: number | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
};

/** Per-package totals; null name and price group the answers with no package chosen. */
export type PackagePaymentSummary = {
  packageName: string | null;
  priceCents: number | null;
  /** Payments reported (a plan paid in three abonos counts three). */
  count: number;
  /** Reported, confirmed or not; rejected payments excluded. */
  totalCents: number;
  confirmedCents: number;
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
  reviewedByEmail: string | null;
  answers: PackagePaymentAnswer[];
};

/** A submission with its raw answers and the fields it was sent with. */
export type PackagePaymentExportRow = PackagePaymentRow & {
  answers: Record<string, unknown>;
  fields: FormField[];
};
