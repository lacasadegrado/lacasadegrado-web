import { installmentAmounts } from "@/modules/forms/lib/utils/installments.util";

import type { CustomerPlan } from "../types/plans.types";

export type InstallmentState = "paid" | "checking" | "due";

export type InstallmentLine = { number: number; amountCents: number; state: InstallmentState };

/**
 * Each installment with what the person should understand about it:
 * paid (confirmed), being checked (reported, not confirmed yet) or still
 * to pay. Confirmed parts come first, then the ones under review.
 */
export function installmentLines(plan: Pick<CustomerPlan, "priceCents" | "installments" | "status" | "payments">) {
  const covered = (status: "confirmed" | "pending") =>
    plan.payments.filter((payment) => payment.status === status).reduce((sum, p) => sum + p.installmentsCovered, 0);
  const paid = plan.status === "paid" ? plan.installments : covered("confirmed");
  const checking = covered("pending");

  return installmentAmounts(plan.priceCents, plan.installments).map((amountCents, index): InstallmentLine => ({
    number: index + 1,
    amountCents,
    state: index < paid ? "paid" : index < paid + checking ? "checking" : "due",
  }));
}

/** "1 cuota", "2 cuotas": how the person picks and sees a payment. */
export function installmentCountLabel(count: number): string {
  return `${count} cuota${count === 1 ? "" : "s"}`;
}
