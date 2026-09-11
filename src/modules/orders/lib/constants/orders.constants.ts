export const ORDERS_PATHS = {
  order: (orderId: string) => `/orders/${orderId}`,
} as const;

export const ORDER_STATUS_LABELS = {
  pending_payment: "Pendiente de pago",
  pending_verification: "En revisión",
  paid: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
} as const;
