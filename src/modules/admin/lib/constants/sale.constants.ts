import type { OrderStatus } from "@/common/lib/db/schema";
import { PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants";

/** Status filter in Ventas, in the order the dropdown lists them. */
export const SALES_STATUS_FILTERS: readonly { value: OrderStatus | "all"; label: string }[] = [
  { value: "paid", label: "Aprobadas" },
  { value: "pending_verification", label: "En revisión" },
  { value: "pending_payment", label: "Sin pagar" },
  { value: "rejected", label: "Rechazadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "all", label: "Todas" },
];

export const SALE_STATUS_BADGE: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending_verification: "secondary",
  pending_payment: "outline",
  rejected: "destructive",
  cancelled: "outline",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.id, method.label]),
);

/** Review of a package payment (first payment or abono). */
export const PACKAGE_PAYMENT_STATUS_LABELS = {
  pending: "Por revisar",
  confirmed: "Confirmado",
  rejected: "Rechazado",
} as const;

export const PACKAGE_PAYMENT_STATUS_BADGE = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
} as const;

export const PAYMENT_STATUS_LABELS = {
  submitted: "Por revisar",
  verified: "Aprobado",
  rejected: "Rechazado",
} as const;
