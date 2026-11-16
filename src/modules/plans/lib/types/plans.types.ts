import type { PackagePaymentStatus, PackagePlanStatus } from "@/common/lib/db/schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import type { PlanReceipt } from "@/modules/forms/lib/types/public-form.types";

/** One package plan of the signed-in person, as the "Pagos" list shows it. */
export type CustomerPlanSummary = {
  id: string;
  eventName: string;
  packageName: string;
  personName: string | null;
  priceCents: number;
  installments: number;
  status: PackagePlanStatus;
  confirmedCents: number;
  pendingCents: number;
  /** Parts confirmed or under review; the next payment starts after them. */
  reservedInstallments: number;
  /** A rejected payment whose parts are free again: they should report it anew. */
  hasRejected: boolean;
  createdAt: Date;
};

export type CustomerPlanPayment = {
  id: string;
  submittedAt: Date;
  amountCents: number;
  installmentsCovered: number;
  status: PackagePaymentStatus;
  rejectionReason: string | null;
  reference: string | null;
  /** Registered by the team (cash, WhatsApp), not reported by the person. */
  recorded: boolean;
};

/** One plan with its payments and what the next payment asks. Only for its owner. */
export type CustomerPlan = CustomerPlanSummary & {
  payments: CustomerPlanPayment[];
  /** Reference and proof, the same for every plan. */
  fields: FormField[];
  /** Latest stored EUR to VES rate, to show bolívares. */
  eurToVes: number | null;
};

export type PreparePlanUploadResult = { ok: true; key: string; uploadUrl: string } | { ok: false; message: string };

export type SubmitPlanPaymentResult =
  | { ok: true; receipt: PlanReceipt }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
