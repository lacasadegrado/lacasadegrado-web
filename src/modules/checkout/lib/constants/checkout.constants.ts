import type { PaymentMethodDefinition } from "../types/checkout.types";

/** The payment page has two steps: pay first, then report what you paid. */
export const PAYMENT_STEPS = {
  pay: "pagar",
  report: "reportar",
} as const;

export type PaymentStep = (typeof PAYMENT_STEPS)[keyof typeof PAYMENT_STEPS];

/** Query param that selects the step, so refresh and back keep the place. */
export const PAYMENT_STEP_PARAM = "paso";

export const CHECKOUT_PATHS = {
  checkout: "/checkout",
  payment: (orderId: string, step?: PaymentStep) =>
    `/checkout/${orderId}/payment${step ? `?${PAYMENT_STEP_PARAM}=${step}` : ""}`,
} as const;

/**
 * Phase 1 ships the two manual methods. The rest are declared so the UI
 * can show them as coming soon and so the union is complete.
 */
export const PAYMENT_METHODS: readonly PaymentMethodDefinition[] = [
  {
    id: "pago_movil",
    kind: "manual",
    label: "Pago Móvil",
    description: "Desde la app de tu banco, en bolívares.",
    enabled: true,
  },
  {
    id: "bank_transfer",
    kind: "manual",
    label: "Transferencia bancaria",
    description: "A nuestra cuenta en bolívares.",
    enabled: true,
  },
  {
    id: "binance",
    kind: "automated",
    label: "Binance Pay",
    description: "Pago automático, disponible más adelante.",
    enabled: false,
  },
  {
    id: "paypal",
    kind: "automated",
    label: "PayPal",
    description: "Pago automático, disponible más adelante.",
    enabled: false,
  },
  {
    id: "card",
    kind: "automated",
    label: "Tarjeta",
    description: "Pago automático, disponible más adelante.",
    enabled: false,
  },
];

export const ENABLED_PAYMENT_METHOD_IDS = PAYMENT_METHODS.filter((m) => m.enabled).map(
  (m) => m.id,
);

export const EXCHANGE_RATE = {
  /** Latest stored rate older than this triggers a DolarApi refresh at checkout. */
  maxAgeMs: 12 * 60 * 60 * 1000,
  /**
   * Prices are in euros; bolívar amounts use the BCV official EUR rate.
   * "paralelo" is available in the admin for reference.
   */
  apiSource: "oficial",
  apiUrl: "https://ve.dolarapi.com/v1/euros",
  apiTimeoutMs: 5000,
} as const;

export const PROOF_UPLOAD = {
  maxBytes: 8 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
} as const;
