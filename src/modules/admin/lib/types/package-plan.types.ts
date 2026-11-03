import type { PackagePaymentStatus, PackagePlanStatus } from "@/common/lib/db/schema";

export type PackagePlanFilters = {
  eventId?: string;
  /** `open` = still owes money. */
  status?: PackagePlanStatus;
  /** Matches email or name, case-insensitive. */
  query?: string;
};

/** One person paying one package, with the balance from their payments. */
export type PackagePlanRow = {
  id: string;
  email: string | null;
  personName: string | null;
  packageName: string;
  priceCents: number;
  installments: number;
  status: PackagePlanStatus;
  createdAt: Date;
  paidAt: Date | null;
  eventName: string;
  confirmedCents: number;
  pendingCents: number;
  /** Payments waiting for review. */
  pendingCount: number;
  lastPaymentAt: Date | null;
};

export type PackagePlanPayment = {
  id: string;
  submittedAt: Date;
  amountCents: number;
  installmentsCovered: number;
  eurToVes: number | null;
  reference: string | null;
  status: PackagePaymentStatus;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  hasProof: boolean;
};

export type PackagePlanDetail = PackagePlanRow & {
  eventId: string;
  formId: string;
  formTitle: string;
  payments: PackagePlanPayment[];
};
