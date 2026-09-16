import type { PaymentMethod } from "@/common/lib/db/schema";
import type { ExchangeRateSource } from "@/common/lib/db/schema";
import type { CartItem } from "@/modules/cart/lib/types/cart.types";

/**
 * Payment method layer as a discriminated union (brief, section 9).
 * Adding an automated provider later means adding a case with
 * `kind: "automated"` and its own flow, not touching the manual one.
 */
type ManualPaymentMethodId = Extract<PaymentMethod, "pago_movil" | "bank_transfer">;
type AutomatedPaymentMethodId = Exclude<PaymentMethod, ManualPaymentMethodId>;

export type ManualPaymentMethod = {
  id: ManualPaymentMethodId;
  kind: "manual";
  label: string;
  description: string;
  enabled: true;
};

export type AutomatedPaymentMethod = {
  id: AutomatedPaymentMethodId;
  kind: "automated";
  label: string;
  description: string;
  enabled: false;
};

export type PaymentMethodDefinition = ManualPaymentMethod | AutomatedPaymentMethod;

export type CurrentRate = {
  eurToVes: number;
  effectiveAt: Date;
  source: ExchangeRateSource;
};

export type CheckoutQuote = {
  items: CartItem[];
  unavailableIds: string[];
  subtotalCents: number;
  totalCents: number;
  /** Buyable lines chosen as prints. */
  printCount: number;
  rate: CurrentRate | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "empty" | "unavailable" | "no_rate" | "terms"; unavailableIds?: string[] };

export type PaymentFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type PrepareProofUploadResult =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; message: string };
