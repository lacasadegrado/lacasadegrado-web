/** The customer's "Pagos": their package payment plans, behind login. */
export const PLANS_PATHS = {
  list: "/dashboard/payments",
  plan: (planId: string) => `/dashboard/payments/${planId}`,
} as const;
