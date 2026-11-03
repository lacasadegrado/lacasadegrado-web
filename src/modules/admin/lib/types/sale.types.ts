import type { OrderStatus, PaymentMethod, PaymentStatus, PhotoFormat, PrintStatus } from "@/common/lib/db/schema";

/** One order in Ventas › list. */
export type SaleRow = {
  orderId: string;
  createdAt: Date;
  paidAt: Date | null;
  status: OrderStatus;
  buyerEmail: string;
  buyerName: string | null;
  method: PaymentMethod;
  totalCents: number;
  /** EUR to VES rate snapshotted at checkout. */
  eurToVes: number | null;
  itemCount: number;
  printCount: number;
  /** Event names of the photos, in alphabetical order. */
  eventNames: string[];
};

export type SalesTotals = { count: number; totalCents: number; photos: number };

export type SaleItem = {
  photoId: string;
  filename: string;
  width: number;
  height: number;
  eventName: string;
  format: PhotoFormat;
  unitPriceCents: number;
  /** Download URLs issued for this photo to the buyer, and the latest one. */
  downloads: number;
  lastDownloadAt: Date | null;
};

export type SalePayment = {
  id: string;
  reference: string;
  payerName: string;
  payerPhone: string | null;
  payerBank: string | null;
  amountCents: number;
  status: PaymentStatus;
  submittedAt: Date;
  verifiedAt: Date | null;
  verifiedByEmail: string | null;
  rejectionReason: string | null;
  hasProof: boolean;
};

export type SaleDetail = Omit<SaleRow, "itemCount" | "printCount" | "eventNames"> & {
  buyerId: string;
  printStatus: PrintStatus | null;
  printDeliveredAt: Date | null;
  termsVersion: string | null;
  items: SaleItem[];
  /** Newest first: a rejected payment can be followed by a new one. */
  payments: SalePayment[];
};
