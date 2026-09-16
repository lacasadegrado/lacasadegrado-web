import type { PrintStatus } from "@/common/lib/db/schema";

/** A paid order with at least one printed photo, as the Impresiones list shows it. */
export type PrintJob = {
  orderId: string;
  customerEmail: string;
  customerName: string | null;
  /** Institution of the event; prints are delivered there. */
  institution: string;
  eventName: string;
  printCount: number;
  paidAt: Date | null;
  printStatus: PrintStatus;
  printDeliveredAt: Date | null;
};

export type MarkDeliveredResult =
  | { ok: true; job: PrintJob }
  | { ok: false; reason: "not_found" | "wrong_status" };
