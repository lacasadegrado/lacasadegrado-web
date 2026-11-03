import "server-only";

import { and, asc, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, packagePlans } from "@/common/lib/db/schema";
import { newPlanToken, planBalance, planUrl } from "@/modules/forms/lib/services/package-plan.service";

import type { PackagePlanDetail, PackagePlanFilters, PackagePlanRow } from "../types/package-plan.types";
import { likePattern } from "../utils/package-payment.util";

export const PACKAGE_PLANS_PAGE_SIZE = 50;

export type PackageReviewOutcome =
  | {
      ok: true;
      outcome: "confirmed" | "paid" | "rejected";
      email: string | null;
      personName: string | null;
      eventName: string;
      formSlug: string;
      packageName: string | null;
      amountCents: number;
      confirmedCents: number;
      priceCents: number;
      planId: string | null;
      /** New plan link after a rejection, so the email can include it. */
      planUrl: string | null;
    }
  | { ok: false; reason: "not_found" | "wrong_status" };

/**
 * Confirms or rejects one package payment, with the submission and its
 * plan locked so two admins cannot count the same money twice. A
 * confirmation that covers the price marks the plan paid. A rejection
 * frees its parts and gets the plan a new link for the person to report
 * again.
 */
export async function reviewPackagePayment(
  adminId: string,
  submissionId: string,
  decision: { action: "confirm" } | { action: "reject"; reason: string },
): Promise<PackageReviewOutcome> {
  return db.transaction(async (tx) => {
    const [submission] = await tx
      .select({
        id: formSubmissions.id,
        status: formSubmissions.paymentStatus,
        planId: formSubmissions.planId,
        email: formSubmissions.email,
        packageName: formSubmissions.packageName,
        packagePriceCents: formSubmissions.packagePriceCents,
        amountCents: formSubmissions.amountCents,
        formSlug: forms.slug,
        eventName: events.name,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(forms.id, formSubmissions.formId))
      .innerJoin(events, eq(events.id, forms.eventId))
      .where(eq(formSubmissions.id, submissionId))
      .for("update", { of: formSubmissions })
      .limit(1);
    if (!submission) return { ok: false, reason: "not_found" };
    if (submission.status !== "pending") return { ok: false, reason: "wrong_status" };

    const plan = submission.planId
      ? (
          await tx
            .select({
              id: packagePlans.id,
              status: packagePlans.status,
              priceCents: packagePlans.priceCents,
              personName: packagePlans.personName,
              email: packagePlans.email,
            })
            .from(packagePlans)
            .where(eq(packagePlans.id, submission.planId))
            .for("update")
        )[0]
      : undefined;

    const now = new Date();
    const confirming = decision.action === "confirm";
    await tx
      .update(formSubmissions)
      .set({
        paymentStatus: confirming ? "confirmed" : "rejected",
        reviewedAt: now,
        reviewedBy: adminId,
        rejectionReason: confirming ? null : decision.reason,
      })
      .where(eq(formSubmissions.id, submission.id));

    const amountCents = submission.amountCents ?? submission.packagePriceCents ?? 0;
    const priceCents = plan?.priceCents ?? submission.packagePriceCents ?? amountCents;
    let confirmedCents = confirming ? amountCents : 0;
    let outcome: "confirmed" | "paid" | "rejected" = confirming ? "confirmed" : "rejected";
    let link: string | null = null;

    if (plan) {
      confirmedCents = (await planBalance(tx, plan.id)).confirmedCents;
      if (confirming && plan.status === "open" && confirmedCents >= plan.priceCents) {
        await tx.update(packagePlans).set({ status: "paid", paidAt: now }).where(eq(packagePlans.id, plan.id));
        outcome = "paid";
      }
      if (!confirming && plan.status === "open") {
        const { token, tokenHash } = newPlanToken();
        await tx.update(packagePlans).set({ tokenHash }).where(eq(packagePlans.id, plan.id));
        link = planUrl(token);
      }
    } else if (confirming && amountCents >= priceCents) {
      outcome = "confirmed";
    }

    return {
      ok: true,
      outcome,
      email: plan?.email ?? submission.email,
      personName: plan?.personName ?? null,
      eventName: submission.eventName,
      formSlug: submission.formSlug,
      packageName: submission.packageName,
      amountCents,
      confirmedCents,
      priceCents,
      planId: plan?.id ?? null,
      planUrl: link,
    };
  });
}

/** For the sidebar badge: package payments waiting for review. */
export async function countPendingPackagePayments(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(formSubmissions)
    .where(eq(formSubmissions.paymentStatus, "pending"));
  return row?.total ?? 0;
}

const balanceColumns = {
  confirmedCents: sql<number>`coalesce((select sum(${formSubmissions.amountCents}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'confirmed'), 0)::int`,
  pendingCents: sql<number>`coalesce((select sum(${formSubmissions.amountCents}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'pending'), 0)::int`,
  pendingCount: sql<number>`(select count(*) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'pending')::int`,
  lastPaymentAt: sql<Date | null>`(select max(${formSubmissions.submittedAt}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id})`,
};

function whereForPlans(filters: PackagePlanFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.eventId) conditions.push(eq(packagePlans.eventId, filters.eventId));
  if (filters.status) conditions.push(eq(packagePlans.status, filters.status));
  if (filters.query) {
    const pattern = likePattern(filters.query);
    conditions.push(sql`(${ilike(sql`${packagePlans.email}::text`, pattern)} or ${ilike(packagePlans.personName, pattern)})`);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Plans with their balance, the ones with payments to review first, then the newest. */
export async function listPackagePlans(
  filters: PackagePlanFilters,
  page: number,
): Promise<{ rows: PackagePlanRow[]; total: number }> {
  const where = whereForPlans(filters);
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: packagePlans.id,
        email: packagePlans.email,
        personName: packagePlans.personName,
        packageName: packagePlans.packageName,
        priceCents: packagePlans.priceCents,
        installments: packagePlans.installments,
        status: packagePlans.status,
        createdAt: packagePlans.createdAt,
        paidAt: packagePlans.paidAt,
        eventName: events.name,
        ...balanceColumns,
      })
      .from(packagePlans)
      .innerJoin(events, eq(events.id, packagePlans.eventId))
      .where(where)
      .orderBy(desc(balanceColumns.pendingCount), desc(packagePlans.createdAt))
      .limit(PACKAGE_PLANS_PAGE_SIZE)
      .offset((page - 1) * PACKAGE_PLANS_PAGE_SIZE),
    db.select({ total: count() }).from(packagePlans).where(where),
  ]);
  return {
    rows: rows.map((row) => ({ ...row, lastPaymentAt: row.lastPaymentAt ? new Date(row.lastPaymentAt) : null })),
    total: totals?.total ?? 0,
  };
}

/** One plan with all its payments, oldest first. */
export async function getPackagePlan(planId: string): Promise<PackagePlanDetail | null> {
  const [plan] = await db
    .select({
      id: packagePlans.id,
      email: packagePlans.email,
      personName: packagePlans.personName,
      packageName: packagePlans.packageName,
      priceCents: packagePlans.priceCents,
      installments: packagePlans.installments,
      status: packagePlans.status,
      createdAt: packagePlans.createdAt,
      paidAt: packagePlans.paidAt,
      eventId: packagePlans.eventId,
      eventName: events.name,
      formId: forms.id,
      formTitle: forms.title,
      ...balanceColumns,
    })
    .from(packagePlans)
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .innerJoin(forms, eq(forms.id, packagePlans.formId))
    .where(eq(packagePlans.id, planId))
    .limit(1);
  if (!plan) return null;

  const payments = await db
    .select({
      id: formSubmissions.id,
      submittedAt: formSubmissions.submittedAt,
      amountCents: formSubmissions.amountCents,
      installmentsCovered: formSubmissions.installmentsCovered,
      eurToVes: formSubmissions.eurToVes,
      reference: formSubmissions.reference,
      status: formSubmissions.paymentStatus,
      rejectionReason: formSubmissions.rejectionReason,
      reviewedAt: formSubmissions.reviewedAt,
      proofKey: formSubmissions.proofKey,
    })
    .from(formSubmissions)
    .where(eq(formSubmissions.planId, plan.id))
    .orderBy(asc(formSubmissions.submittedAt));

  return {
    ...plan,
    lastPaymentAt: plan.lastPaymentAt ? new Date(plan.lastPaymentAt) : null,
    payments: payments.map(({ proofKey, eurToVes, ...payment }) => ({
      ...payment,
      amountCents: payment.amountCents ?? 0,
      installmentsCovered: payment.installmentsCovered ?? 0,
      status: payment.status ?? "pending",
      eurToVes: eurToVes ? Number(eurToVes) : null,
      hasProof: proofKey !== null,
    })),
  };
}
