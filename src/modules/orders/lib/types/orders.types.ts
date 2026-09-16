import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PhotoFormat,
  PrintStatus,
} from "@/common/lib/db/schema";

export type OrderLine = {
  photoId: string;
  width: number;
  height: number;
  format: PhotoFormat;
  unitPriceCents: number;
  eventName: string;
};

export type OrderPayment = {
  id: string;
  reference: string;
  payerName: string;
  payerBank: string | null;
  status: PaymentStatus;
  submittedAt: Date;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  hasProof: boolean;
};

/** An order as its owner sees it. No storage keys. */
export type OrderDetail = {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  totalCents: number;
  eurToVes: number | null;
  createdAt: Date;
  paidAt: Date | null;
  /** Null when the order has no print items. */
  printStatus: PrintStatus | null;
  printDeliveredAt: Date | null;
  items: OrderLine[];
  /** Newest first. */
  payments: OrderPayment[];
};
