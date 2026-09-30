import type { FormField, FormFieldType } from "@/modules/forms/lib/types/form.types";

export type PackagePaymentFilters = {
  eventId?: string;
  formId?: string;
  packageId?: string;
  /** Matches email or reference, case-insensitive. */
  query?: string;
};

export type PackagePaymentRow = {
  id: string;
  submittedAt: Date;
  email: string;
  reference: string;
  packageName: string;
  packagePriceCents: number;
  formId: string;
  formTitle: string;
  eventName: string;
};

export type PackagePaymentSummary = {
  packageName: string;
  priceCents: number;
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
