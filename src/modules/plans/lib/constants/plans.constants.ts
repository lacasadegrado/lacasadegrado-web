import type { PlanPaymentMethod } from "@/common/lib/db/schema";

/** The customer's "Pagos": their package payment plans, behind login. */
export const PLANS_PATHS = {
  list: "/dashboard/payments",
  /** `sent`: just reported a payment, the page opens with the confirmation. */
  plan: (planId: string, sent = false) => `/dashboard/payments/${planId}${sent ? "?enviado=1" : ""}`,
  /** Printable receipt of a fully paid package. */
  receipt: (planId: string) => `/dashboard/payments/${planId}/receipt`,
  /** The "Pagar" stepper; the step and the choices so far live in the query string. */
  pay: (planId: string, state: PlanPayState = {}) => {
    const params = new URLSearchParams();
    if (state.step) params.set("paso", state.step);
    if (state.count) params.set("cuotas", String(state.count));
    if (state.method) params.set("metodo", state.method);
    const query = params.toString();
    return `/dashboard/payments/${planId}/pay${query ? `?${query}` : ""}`;
  },
} as const;

/** "Pagar", one question per screen: how many installments, how, the details, then report it. */
export const PLAN_PAY_STEPS = ["cuotas", "metodo", "datos", "reportar"] as const;
export type PlanPayStep = (typeof PLAN_PAY_STEPS)[number];

export type PlanPayState = { step?: PlanPayStep; count?: number; method?: PlanPaymentMethod };

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
