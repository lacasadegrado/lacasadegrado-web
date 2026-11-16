import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, packagePlans } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { formatEur } from "@/common/lib/utils/money.util";
import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";
import { notifyAdmins } from "@/modules/admin/lib/services/notification.service";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";
import { getCurrentRate, getLatestRate } from "@/modules/checkout/lib/services/exchange-rate.service";
import { buildAnswersSchema } from "@/modules/forms/lib/schemas/form-answers.schema";
import { presignFormFile, verifyFileAnswers, type PresignFileOutcome } from "@/modules/forms/lib/services/form-files.service";
import {
  isSubmitAllowed,
  isUploadAllowed,
  recordFormAttempt,
  type FormClient,
} from "@/modules/forms/lib/services/form-rate-limit.service";
import { planBalance, plansUrl } from "@/modules/forms/lib/services/package-plan.service";
import type { FormAnswers, FormFileAnswer } from "@/modules/forms/lib/types/form.types";
import type { PlanReceipt } from "@/modules/forms/lib/types/public-form.types";
import { buildFormSubmittedEmail } from "@/modules/forms/lib/utils/form-email.util";
import { PLAN_PAYMENT_FIELDS } from "@/modules/forms/lib/utils/form-fields.util";
import { amountForInstallments } from "@/modules/forms/lib/utils/installments.util";

import type { PreparePlanUploadInput, SubmitPlanPaymentInput } from "../schemas/plans.schema";
import type { CustomerPlan, CustomerPlanSummary } from "../types/plans.types";

/**
 * "Pagos": the signed-in person's package plans. Every read and write is
 * scoped to `packagePlans.email = viewer.email`; a plan id of someone else
 * behaves exactly like one that does not exist.
 */

const balanceColumns = {
  confirmedCents: sql<number>`coalesce((select sum(${formSubmissions.amountCents}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'confirmed'), 0)::int`,
  pendingCents: sql<number>`coalesce((select sum(${formSubmissions.amountCents}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'pending'), 0)::int`,
  reservedInstallments: sql<number>`coalesce((select sum(${formSubmissions.installmentsCovered}) from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} in ('pending', 'confirmed')), 0)::int`,
  hasRejected: sql<boolean>`exists (select 1 from ${formSubmissions} where ${formSubmissions.planId} = ${packagePlans.id} and ${formSubmissions.paymentStatus} = 'rejected')`,
};

const summaryColumns = {
  id: packagePlans.id,
  eventName: events.name,
  packageName: packagePlans.packageName,
  personName: packagePlans.personName,
  priceCents: packagePlans.priceCents,
  installments: packagePlans.installments,
  status: packagePlans.status,
  createdAt: packagePlans.createdAt,
  ...balanceColumns,
};

/** Whether "Pagos" belongs in this person's menu. */
export async function hasPlans(email: string): Promise<boolean> {
  const [row] = await db.select({ id: packagePlans.id }).from(packagePlans).where(eq(packagePlans.email, email)).limit(1);
  return Boolean(row);
}

/** Open plans first, then the newest. */
export async function listPlansForEmail(email: string): Promise<CustomerPlanSummary[]> {
  return db
    .select(summaryColumns)
    .from(packagePlans)
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .where(eq(packagePlans.email, email))
    .orderBy(sql`${packagePlans.status} = 'paid'`, desc(packagePlans.createdAt));
}

export async function getPlanForEmail(planId: string, email: string): Promise<CustomerPlan | null> {
  const [plan] = await db
    .select(summaryColumns)
    .from(packagePlans)
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .where(and(eq(packagePlans.id, planId), eq(packagePlans.email, email)))
    .limit(1);
  if (!plan) return null;

  const payments = await db
    .select({
      id: formSubmissions.id,
      submittedAt: formSubmissions.submittedAt,
      amountCents: formSubmissions.amountCents,
      installmentsCovered: formSubmissions.installmentsCovered,
      status: formSubmissions.paymentStatus,
      rejectionReason: formSubmissions.rejectionReason,
      reference: formSubmissions.reference,
      recordedBy: formSubmissions.recordedBy,
    })
    .from(formSubmissions)
    .where(and(eq(formSubmissions.planId, plan.id), sql`${formSubmissions.paymentStatus} is not null`))
    .orderBy(asc(formSubmissions.submittedAt));
  const rate = await getLatestRate();

  return {
    ...plan,
    payments: payments.map(({ recordedBy, ...payment }) => ({
      ...payment,
      amountCents: payment.amountCents ?? 0,
      installmentsCovered: payment.installmentsCovered ?? 0,
      status: payment.status ?? "pending",
      recorded: recordedBy !== null,
    })),
    fields: PLAN_PAYMENT_FIELDS,
    eurToVes: rate?.eurToVes ?? null,
  };
}

type OwnedPlan = {
  id: string;
  status: "open" | "paid";
  email: string;
  personName: string | null;
  packageId: string;
  packageName: string;
  priceCents: number;
  installments: number;
  formId: string;
  formTitle: string;
  formVersion: number;
  eventName: string;
};

async function loadOwnedPlan(planId: string, email: string): Promise<OwnedPlan | null> {
  const [row] = await db
    .select({
      id: packagePlans.id,
      status: packagePlans.status,
      personName: packagePlans.personName,
      packageId: packagePlans.packageId,
      packageName: packagePlans.packageName,
      priceCents: packagePlans.priceCents,
      installments: packagePlans.installments,
      formId: forms.id,
      formTitle: forms.title,
      formVersion: forms.version,
      eventName: events.name,
    })
    .from(packagePlans)
    .innerJoin(forms, eq(forms.id, packagePlans.formId))
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .where(and(eq(packagePlans.id, planId), eq(packagePlans.email, email)))
    .limit(1);
  return row ? { ...row, email } : null;
}

export type PreparePlanUploadOutcome = PresignFileOutcome | { ok: false; reason: "not_found" | "paid" | "rate_limited" };

/** Presigned PUT for a payment's proof, under the plan form's prefix like any form file. */
export async function preparePlanUpload(
  input: PreparePlanUploadInput,
  viewer: SessionUser,
  client: FormClient,
): Promise<PreparePlanUploadOutcome> {
  const plan = await loadOwnedPlan(input.planId, viewer.email);
  if (!plan) return { ok: false, reason: "not_found" };
  if (plan.status !== "open") return { ok: false, reason: "paid" };
  if (!(await isUploadAllowed(client))) return { ok: false, reason: "rate_limited" };

  const outcome = await presignFormFile({
    formId: plan.formId,
    draftId: input.draftId,
    field: PLAN_PAYMENT_FIELDS.find((field) => field.id === input.fieldId),
    type: input.type,
    size: input.size,
  });
  if (outcome.ok) await recordFormAttempt({ kind: "upload", formId: plan.formId, ip: client.ip });
  return outcome;
}

export type SubmitPlanPaymentOutcome =
  | { ok: true; receipt: PlanReceipt }
  | { ok: false; reason: "not_found" | "paid" | "rate_limited" }
  | { ok: false; reason: "invalid"; message?: string; fieldErrors: Record<string, string> };

/**
 * One or more installments with their reference and proof, pending review.
 * The plan row is locked while the parts are counted, so two tabs cannot
 * report the same part twice. Works while the plan is open, even if its
 * form has closed.
 */
export async function submitPlanPayment(
  input: SubmitPlanPaymentInput,
  viewer: SessionUser,
  client: FormClient,
): Promise<SubmitPlanPaymentOutcome> {
  const plan = await loadOwnedPlan(input.planId, viewer.email);
  if (!plan) return { ok: false, reason: "not_found" };
  if (plan.status !== "open") return { ok: false, reason: "paid" };

  const fields = PLAN_PAYMENT_FIELDS;
  const parsed = buildAnswersSchema(fields, []).safeParse(input.answers);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, reason: "invalid", fieldErrors };
  }
  const answers = parsed.data as FormAnswers;
  if (!(await isSubmitAllowed(plan.formId, plan.email, client))) return { ok: false, reason: "rate_limited" };

  const fileErrors = await verifyFileAnswers(plan.formId, input.draftId, fields, answers);
  if (Object.keys(fileErrors).length > 0) return { ok: false, reason: "invalid", fieldErrors: fileErrors };

  const rate = await getCurrentRate();
  const reference = typeof answers.reference === "string" ? answers.reference : null;
  const proof = Array.isArray(answers.proof) ? (answers.proof as FormFileAnswer[]) : [];

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: packagePlans.status })
      .from(packagePlans)
      .where(eq(packagePlans.id, plan.id))
      .for("update");
    if (locked?.status !== "open") return { ok: false as const, message: "Este paquete ya está pagado." };

    const balance = await planBalance(tx, plan.id);
    const remaining = plan.installments - balance.reservedInstallments;
    if (input.installments < 1 || input.installments > remaining) {
      return {
        ok: false as const,
        message:
          remaining <= 0
            ? "Todas tus cuotas ya están pagadas o en revisión."
            : `Puedes pagar hasta ${remaining} cuota${remaining === 1 ? "" : "s"}.`,
      };
    }
    const amountCents = amountForInstallments(
      plan.priceCents,
      plan.installments,
      balance.reservedInstallments,
      input.installments,
    );
    const [row] = await tx
      .insert(formSubmissions)
      .values({
        formId: plan.formId,
        packageId: plan.packageId,
        packageName: plan.packageName,
        packagePriceCents: plan.priceCents,
        email: plan.email,
        reference,
        proofKey: proof[0]?.key ?? null,
        answers,
        fieldsSnapshot: fields,
        formVersion: plan.formVersion,
        planId: plan.id,
        installmentsCovered: input.installments,
        amountCents,
        eurToVes: rate ? rate.eurToVes.toFixed(4) : null,
        paymentStatus: "pending",
      })
      .returning({ id: formSubmissions.id });
    return { ok: true as const, submissionId: row.id, amountCents, balance };
  });

  if (!result.ok) {
    return { ok: false, reason: "invalid", message: result.message, fieldErrors: { installments: result.message } };
  }
  await recordFormAttempt({ kind: "submit", formId: plan.formId, ip: client.ip, email: plan.email });

  const receipt: PlanReceipt = {
    url: plansUrl(),
    amountCents: result.amountCents,
    eurToVes: rate?.eurToVes ?? null,
    installmentsCovered: input.installments,
    installments: plan.installments,
    priceCents: plan.priceCents,
    confirmedCents: result.balance.confirmedCents,
    pendingCents: result.balance.pendingCents + result.amountCents,
  };

  await notifyAdmins({
    kind: "package_payment",
    title: "Pago de paquete por revisar",
    body: `${plan.personName ?? plan.email} · ${plan.packageName} · ${formatEur(result.amountCents)}`,
    href: ADMIN_PATHS.packagePayment(result.submissionId),
  });
  const message = buildFormSubmittedEmail({
    formTitle: plan.formTitle,
    eventName: plan.eventName,
    receipt: {
      kind: "package_payment",
      packageName: plan.packageName,
      priceCents: plan.priceCents,
      reference,
      email: plan.email,
      plan: receipt,
      signup: null,
    },
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: plan.email, ...message });
  if (!sent) console.error("[plans] payment receipt email failed", { planId: plan.id });

  return { ok: true, receipt };
}
