import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "pending_verification",
  "paid",
  "rejected",
  "cancelled",
]);

/**
 * Full set is declared now so adding an automated provider later is a new
 * case in the checkout discriminated union, not a migration. Phase 1 only
 * enables `pago_movil` and `bank_transfer` in the UI.
 */
export const paymentMethodEnum = pgEnum("payment_method", [
  "pago_movil",
  "bank_transfer",
  "binance",
  "paypal",
  "card",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "submitted",
  "verified",
  "rejected",
]);

export const supportChannelEnum = pgEnum("support_channel", ["form", "whatsapp"]);

export const supportStatusEnum = pgEnum("support_status", [
  "new",
  "answered",
  "closed",
]);

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type SupportChannel = (typeof supportChannelEnum.enumValues)[number];
export type SupportStatus = (typeof supportStatusEnum.enumValues)[number];
