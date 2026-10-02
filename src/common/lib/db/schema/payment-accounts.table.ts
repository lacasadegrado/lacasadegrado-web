import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { paymentMethodEnum } from "./enums.table";
import { profiles } from "./profiles.table";

/**
 * The business's receiving details per manual payment method (Pago Móvil,
 * bank transfer), edited by the admin in Configuración › Métodos de pago
 * and printed on the payment screen. One row per method. `details` is
 * typed `unknown` on purpose: every read parses it with the checkout
 * module's schema. A method without a row falls back to the placeholders
 * in `business.config.ts`.
 */
export const paymentAccounts = pgTable("payment_accounts", {
  method: paymentMethodEnum("method").primaryKey(),
  details: jsonb("details").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
}).enableRLS();

export type PaymentAccount = typeof paymentAccounts.$inferSelect;
