import "server-only";

import { and, asc, count, desc, eq, ilike, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, packagePlans } from "@/common/lib/db/schema";
import { planBalance } from "@/modules/forms/lib/services/package-plan.service";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { amountForInstallments } from "@/modules/forms/lib/utils/installments.util";
import { getCurrentRate } from "@/modules/checkout/lib/services/exchange-rate.service";

import type { RecordPackagePaymentInput } from "../schemas/payment-review.schema";

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
    }
  | { ok: false; reason: "not_found" | "wrong_status" };

/**
 * Confirms or rejects one package payment, with the submission and its
 * plan locked so two admins cannot count the same money twice. A
 * confirmation that covers the price marks the plan paid. A rejection
 * frees its parts; the person reports again from "Pagos".
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

    if (plan) {
      confirmedCents = (await planBalance(tx, plan.id)).confirmedCents;
      if (confirming && plan.status === "open" && confirmedCents >= plan.priceCents) {
        await tx.update(packagePlans).set({ status: "paid", paidAt: now }).where(eq(packagePlans.id, plan.id));
        outcome = "paid";
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
    };
  });
}

/** What a payment registered by the team stores, so its detail page reads like any answer. */
const RECORDED_PAYMENT_FIELDS: FormField[] = [
  { id: "reference", system: "reference", type: "short_text", label: "Referencia", required: false },
  { id: "note", type: "long_text", label: "Nota del equipo", required: false },
];

export type RecordPackagePaymentOutcome =
  | Extract<PackageReviewOutcome, { ok: true }>
  | { ok: false; reason: "not_found" | "paid" | "too_many" };

/**
 * "Registrar pago": the next `installments` parts, received outside the
 * app (cash, WhatsApp), stored as a confirmed payment with `recorded_by`.
 * Same locking and paid-marking as a confirmation.
 */
export async function recordPackagePayment(
  adminId: string,
  input: RecordPackagePaymentInput,
): Promise<RecordPackagePaymentOutcome> {
  const rate = await getCurrentRate();
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .select({
        id: packagePlans.id,
        status: packagePlans.status,
        email: packagePlans.email,
        personName: packagePlans.personName,
        packageId: packagePlans.packageId,
        packageName: packagePlans.packageName,
        priceCents: packagePlans.priceCents,
        installments: packagePlans.installments,
        formId: packagePlans.formId,
        formVersion: forms.version,
        formSlug: forms.slug,
        eventName: events.name,
      })
      .from(packagePlans)
      .innerJoin(forms, eq(forms.id, packagePlans.formId))
      .innerJoin(events, eq(events.id, packagePlans.eventId))
      .where(eq(packagePlans.id, input.planId))
      .for("update", { of: packagePlans })
      .limit(1);
    if (!plan) return { ok: false, reason: "not_found" };
    if (plan.status !== "open") return { ok: false, reason: "paid" };

    const before = await planBalance(tx, plan.id);
    if (input.installments > plan.installments - before.reservedInstallments) return { ok: false, reason: "too_many" };
    const amountCents = amountForInstallments(plan.priceCents, plan.installments, before.reservedInstallments, input.installments);

    const now = new Date();
    await tx.insert(formSubmissions).values({
      formId: plan.formId,
      packageId: plan.packageId,
      packageName: plan.packageName,
      packagePriceCents: plan.priceCents,
      email: plan.email,
      reference: input.reference,
      proofKey: null,
      answers: { ...(input.reference ? { reference: input.reference } : {}), ...(input.note ? { note: input.note } : {}) },
      fieldsSnapshot: RECORDED_PAYMENT_FIELDS,
      formVersion: plan.formVersion,
      planId: plan.id,
      installmentsCovered: input.installments,
      amountCents,
      eurToVes: rate ? rate.eurToVes.toFixed(4) : null,
      paymentStatus: "confirmed",
      reviewedAt: now,
      reviewedBy: adminId,
      recordedBy: adminId,
    });

    const confirmedCents = before.confirmedCents + amountCents;
    const paid = confirmedCents >= plan.priceCents;
    if (paid) await tx.update(packagePlans).set({ status: "paid", paidAt: now }).where(eq(packagePlans.id, plan.id));

    return {
      ok: true,
      outcome: paid ? "paid" : "confirmed",
      email: plan.email,
      personName: plan.personName,
      eventName: plan.eventName,
      formSlug: plan.formSlug,
      packageName: plan.packageName,
      amountCents,
      confirmedCents,
      priceCents: plan.priceCents,
      planId: plan.id,
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
      recordedBy: formSubmissions.recordedBy,
    })
    .from(formSubmissions)
    // The sign-up itself has no payment status: it is not a payment.
    .where(and(eq(formSubmissions.planId, plan.id), isNotNull(formSubmissions.paymentStatus)))
    .orderBy(asc(formSubmissions.submittedAt));

  return {
    ...plan,
    lastPaymentAt: plan.lastPaymentAt ? new Date(plan.lastPaymentAt) : null,
    payments: payments.map(({ proofKey, eurToVes, recordedBy, ...payment }) => ({
      ...payment,
      amountCents: payment.amountCents ?? 0,
      installmentsCovered: payment.installmentsCovered ?? 0,
      status: payment.status ?? "pending",
      eurToVes: eurToVes ? Number(eurToVes) : null,
      hasProof: proofKey !== null,
      recorded: recordedBy !== null,
    })),
  };
}
