import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { paymentMethodEnum, paymentStatusEnum } from "./enums.table";
import { orders } from "./orders.table";
import { profiles } from "./profiles.table";

/**
 * A payment submission by the student. Verified manually by an admin in
 * phase 1. An order can have several rows if a payment is rejected and
 * resubmitted.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    /** Pago Móvil confirmation number or bank transfer reference. */
    reference: text("reference").notNull(),
    payerName: text("payer_name").notNull(),
    payerPhone: text("payer_phone"),
    payerBank: text("payer_bank"),
    amountCents: integer("amount_cents").notNull(),
    /** R2 key under `proofs/` for the uploaded screenshot. Server-only. */
    proofKey: text("proof_key"),
    status: paymentStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
  },
  (t) => [
    index("payments_order_id_idx").on(t.orderId),
    index("payments_status_idx").on(t.status),
  ],
).enableRLS();

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
