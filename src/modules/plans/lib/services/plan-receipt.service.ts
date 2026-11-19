import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, packagePlans } from "@/common/lib/db/schema";

import type { PlanReceiptData } from "../types/plans.types";

/** "LCG-3C747D63": quoted on the phone or WhatsApp to find the plan. */
export function receiptNumber(planId: string): string {
  return `LCG-${planId.slice(0, 8).toUpperCase()}`;
}

/**
 * The receipt of a fully paid package, or null while it is not paid.
 * `owner` scopes it to the signed-in person's email (Pagos); admins pass
 * `null` and see any plan.
 */
export async function getPlanReceipt(planId: string, owner: { email: string } | null): Promise<PlanReceiptData | null> {
  const [plan] = await db
    .select({
      id: packagePlans.id,
      email: packagePlans.email,
      personName: packagePlans.personName,
      packageName: packagePlans.packageName,
      priceCents: packagePlans.priceCents,
      installments: packagePlans.installments,
      status: packagePlans.status,
      paidAt: packagePlans.paidAt,
      eventName: events.name,
    })
    .from(packagePlans)
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .where(and(eq(packagePlans.id, planId), owner ? eq(packagePlans.email, owner.email) : undefined))
    .limit(1);
  if (!plan || plan.status !== "paid") return null;

  const payments = await db
    .select({
      id: formSubmissions.id,
      date: formSubmissions.submittedAt,
      method: formSubmissions.paymentMethod,
      reference: formSubmissions.reference,
      amountCents: formSubmissions.amountCents,
      installmentsCovered: formSubmissions.installmentsCovered,
      eurToVes: formSubmissions.eurToVes,
    })
    .from(formSubmissions)
    .where(and(eq(formSubmissions.planId, plan.id), eq(formSubmissions.paymentStatus, "confirmed")))
    .orderBy(asc(formSubmissions.submittedAt));

  const rows = payments.map((payment) => ({
    ...payment,
    amountCents: payment.amountCents ?? 0,
    installmentsCovered: payment.installmentsCovered ?? 0,
    eurToVes: payment.eurToVes ? Number(payment.eurToVes) : null,
  }));

  return {
    planId: plan.id,
    number: receiptNumber(plan.id),
    email: plan.email,
    personName: plan.personName,
    eventName: plan.eventName,
    packageName: plan.packageName,
    priceCents: plan.priceCents,
    installments: plan.installments,
    // Plans paid before paid_at existed fall back to the last payment.
    paidAt: plan.paidAt ?? rows.at(-1)?.date ?? new Date(),
    payments: rows,
    totalCents: rows.reduce((sum, payment) => sum + payment.amountCents, 0),
  };
}
