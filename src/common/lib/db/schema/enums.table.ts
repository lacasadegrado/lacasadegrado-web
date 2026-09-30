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

/**
 * A package-payment form. Only `open` forms accept submissions; `closed`
 * keeps the link alive to say so instead of a 404.
 */
export const formStatusEnum = pgEnum("form_status", ["draft", "open", "closed"]);

export type FormStatus = (typeof formStatusEnum.enumValues)[number];

/** What a public form visitor did, for the per-IP and per-email limits. */
export const formAttemptKindEnum = pgEnum("form_attempt_kind", ["upload", "submit"]);

export type FormAttemptKind = (typeof formAttemptKindEnum.enumValues)[number];
