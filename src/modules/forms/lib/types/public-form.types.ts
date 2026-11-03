import type { FormKind, FormStatus, PackagePaymentStatus, PackagePlanStatus } from "@/common/lib/db/schema";

import type { FormField, FormPackageOption } from "./form.types";

/**
 * Everything the public page receives. No ids beyond the slug and the
 * package ids the select needs; nothing about other submissions.
 */
export type PublicForm = {
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  kind: FormKind;
  eventName: string;
  institution: string;
  /** YYYY-MM-DD, or null when the event has no date yet. */
  eventDate: string | null;
  fields: FormField[];
  packages: (FormPackageOption & { description: string | null })[];
  /** Latest EUR to VES rate, to show amounts in bolívares; null when none is stored. */
  eurToVes: number | null;
};

export type PrepareFormUploadResult =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; message: string };

export type SubmitFormResult =
  | { ok: true; receipt: SubmitReceipt }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** What the success screen shows; each part is null when that field was left empty. */
export type SubmitReceipt = {
  kind: FormKind;
  packageName: string | null;
  priceCents: number | null;
  reference: string | null;
  email: string | null;
  /** Set when the payment belongs to a payment plan (any package payment). */
  plan: PlanReceipt | null;
};

export type PlanReceipt = {
  /** Absolute link to the plan page, for the next abonos. */
  url: string;
  amountCents: number;
  eurToVes: number | null;
  installmentsCovered: number;
  installments: number;
  priceCents: number;
  /** Confirmed so far; this payment is still under review. */
  confirmedCents: number;
  /** Under review, including this payment. */
  pendingCents: number;
};

/** A payment of a plan, as its private page lists it. */
export type PublicPlanPayment = {
  submittedAt: Date;
  amountCents: number;
  installmentsCovered: number;
  status: PackagePaymentStatus;
  rejectionReason: string | null;
};

/** Everything the plan page (`/abono/<token>`) shows. Nothing beyond this plan. */
export type PublicPlan = {
  formTitle: string;
  formSlug: string;
  eventName: string;
  packageName: string;
  personName: string | null;
  email: string | null;
  priceCents: number;
  installments: number;
  status: PackagePlanStatus;
  confirmedCents: number;
  pendingCents: number;
  /** Parts confirmed or under review; the next payment starts after them. */
  reservedInstallments: number;
  payments: PublicPlanPayment[];
  /** The form's reference and proof questions, asked again on each abono. */
  fields: FormField[];
  eurToVes: number | null;
};

export type SubmitPlanPaymentResult =
  | { ok: true; receipt: PlanReceipt }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type ResendPlanLinkResult = { ok: true } | { ok: false; message: string };
