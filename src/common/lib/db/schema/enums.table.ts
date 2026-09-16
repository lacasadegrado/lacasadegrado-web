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

/** What a person buys for a photo. A print always includes the digital file. */
export const photoFormatEnum = pgEnum("photo_format", ["digital", "print"]);

/**
 * Print fulfilment on an order with print items. Null on orders without
 * prints. Delivery goes to the institution, not the person.
 */
export const printStatusEnum = pgEnum("print_status", ["pending", "delivered"]);

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
export type PhotoFormat = (typeof photoFormatEnum.enumValues)[number];
export type PrintStatus = (typeof printStatusEnum.enumValues)[number];
