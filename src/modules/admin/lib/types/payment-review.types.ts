import type { OrderStatus, PaymentMethod } from "@/common/lib/db/schema";

export type PaymentReviewItem = {
  orderId: string;
  status: OrderStatus;
  createdAt: Date;
  customerEmail: string;
  customerName: string | null;
  method: PaymentMethod;
  totalCents: number;
  eurToVes: number | null;
  itemCount: number;
  /** Lines bought as prints. */
  printCount: number;
  /** How many earlier payments on this order were rejected. */
  previousRejections: number;
  payment: {
    id: string;
    reference: string;
    payerName: string;
    payerPhone: string | null;
    payerBank: string | null;
    amountCents: number;
    submittedAt: Date;
    hasProof: boolean;
  };
};

export type ReviewedPaymentItem = {
  orderId: string;
  status: OrderStatus;
  customerEmail: string;
  totalCents: number;
  reference: string;
  decidedAt: Date;
  rejectionReason: string | null;
};

export type ReviewResult =
  | { ok: true; entitlementsGranted?: number }
  | { ok: false; reason: "not_found" | "wrong_status" };
