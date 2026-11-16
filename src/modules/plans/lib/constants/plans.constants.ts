import type { PlanPaymentMethod } from "@/common/lib/db/schema";

/** The customer's "Pagos": their package payment plans, behind login. */
export const PLANS_PATHS = {
  list: "/dashboard/payments",
  plan: (planId: string) => `/dashboard/payments/${planId}`,
} as const;

/**
 * Package payments arranged by message instead of reported on the page:
 * the person writes to `BUSINESS.paymentContact` and the admin records the
 * money with "Registrar pago". Not part of the checkout method union.
 */
export const PLAN_CONTACT_METHODS = [
  { id: "binance", label: "Binance", description: "Escríbenos y te pasamos los datos." },
  { id: "cash", label: "Efectivo", description: "Escríbenos para acordar la entrega." },
] as const;

export type PlanContactMethodId = (typeof PLAN_CONTACT_METHODS)[number]["id"];

/** Every way an installment can be paid, as stored in `form_submissions.payment_method`. */
export const PLAN_PAYMENT_METHOD_LABELS = {
  pago_movil: "Pago Móvil",
  bank_transfer: "Transferencia bancaria",
  binance: "Binance",
  cash: "Efectivo",
} as const satisfies Record<PlanPaymentMethod, string>;

export const PLAN_PAYMENT_METHOD_IDS = Object.keys(PLAN_PAYMENT_METHOD_LABELS) as [
  PlanPaymentMethod,
  ...PlanPaymentMethod[],
];
