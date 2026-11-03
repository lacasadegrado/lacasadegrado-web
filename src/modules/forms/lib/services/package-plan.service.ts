import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getServerEnv } from "@/common/lib/config/env.config";
import { db, type Db, type DbTransaction } from "@/common/lib/db";
import { events, formSubmissions, forms, packagePlans } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { formatEur } from "@/common/lib/utils/money.util";
import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";
import { notifyAdmins } from "@/modules/admin/lib/services/notification.service";
import { getCurrentRate, getLatestRate } from "@/modules/checkout/lib/services/exchange-rate.service";

import { FORM_RATE_LIMITS, FORMS_PATHS } from "../constants/forms.constants";
import { buildAnswersSchema } from "../schemas/form-answers.schema";
import { formFieldsSchema } from "../schemas/form-field.schema";
import type { FormAnswers, FormField, FormFileAnswer } from "../types/form.types";
import type { PlanReceipt, PublicPlan } from "../types/public-form.types";
import { buildFormSubmittedEmail, buildPlanLinksEmail } from "../utils/form-email.util";
import { amountForInstallments } from "../utils/installments.util";
import { presignFormFile, verifyFileAnswers, type PresignFileOutcome } from "./form-files.service";
import { countAttemptsSince, isSubmitAllowed, isUploadAllowed, recordFormAttempt } from "./form-rate-limit.service";

type Executor = Db | DbTransaction;

/** 32 random bytes as base64url; only the SHA-256 is stored. */
export function newPlanToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPlanToken(token) };
}

export function hashPlanToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function planUrl(token: string): string {
  return `${getServerEnv().NEXT_PUBLIC_APP_URL}${FORMS_PATHS.plan(token)}`;
}

/** The form's reference and proof questions: what every abono asks again. */
export function planPaymentFields(fields: FormField[]): FormField[] {
  return fields
    .filter((field) => field.system === "reference" || field.system === "proof")
    .map((field) => ({ ...field, showIf: undefined }));
}

export type PlanBalance = { confirmedCents: number; pendingCents: number; reservedInstallments: number };

/** Confirmed and under-review money, and the parts they cover. Rejected payments free their parts. */
export async function planBalance(executor: Executor, planId: string): Promise<PlanBalance> {
  const [row] = await executor
    .select({
      confirmedCents: sql<number>`coalesce(sum(${formSubmissions.amountCents}) filter (where ${formSubmissions.paymentStatus} = 'confirmed'), 0)::int`,
      pendingCents: sql<number>`coalesce(sum(${formSubmissions.amountCents}) filter (where ${formSubmissions.paymentStatus} = 'pending'), 0)::int`,
      reservedInstallments: sql<number>`coalesce(sum(${formSubmissions.installmentsCovered}) filter (where ${formSubmissions.paymentStatus} in ('pending', 'confirmed')), 0)::int`,
    })
    .from(formSubmissions)
    .where(eq(formSubmissions.planId, planId));
  return row ?? { confirmedCents: 0, pendingCents: 0, reservedInstallments: 0 };
}

export type PlanPaymentDraft =
  | {
      ok: true;
      planId: string;
      /** Plain token for the receipt link: new, or rotated for a plan found by email. */
      token: string;
      installmentsCovered: number;
      amountCents: number;
      installments: number;
      priceCents: number;
      balance: PlanBalance;
    }
  | { ok: false; message: string };

/**
 * Inside the submission's transaction: the person's open plan for this
 * package (same email), locked, or a new one. A plan found this way gets a
 * new link, since whoever fills the whole form again has likely lost it.
 * Checks the requested parts against what is still unreserved.
 */
export async function preparePlanForPayment(
  tx: DbTransaction,
  input: {
    eventId: string;
    formId: string;
    pkg: { id: string; name: string; priceCents: number; installments: number };
    email: string | null;
    personName: string | null;
    requestedInstallments: number;
  },
): Promise<PlanPaymentDraft> {
  const existing = input.email
    ? (
        await tx
          .select({
            id: packagePlans.id,
            priceCents: packagePlans.priceCents,
            installments: packagePlans.installments,
          })
          .from(packagePlans)
          .where(
            and(
              eq(packagePlans.packageId, input.pkg.id),
              eq(packagePlans.email, input.email),
              eq(packagePlans.status, "open"),
            ),
          )
          .orderBy(desc(packagePlans.createdAt))
          .limit(1)
          .for("update")
      )[0]
    : undefined;

  const { token, tokenHash } = newPlanToken();
  let plan: { id: string; priceCents: number; installments: number };
  if (existing) {
    await tx
      .update(packagePlans)
      .set({ tokenHash, ...(input.personName ? { personName: input.personName } : {}) })
      .where(eq(packagePlans.id, existing.id));
    plan = existing;
  } else {
    const [created] = await tx
      .insert(packagePlans)
      .values({
        eventId: input.eventId,
        packageId: input.pkg.id,
        formId: input.formId,
        email: input.email,
        personName: input.personName,
        packageName: input.pkg.name,
        priceCents: input.pkg.priceCents,
        installments: Math.max(1, input.pkg.installments),
        tokenHash,
      })
      .returning({ id: packagePlans.id, priceCents: packagePlans.priceCents, installments: packagePlans.installments });
    plan = created;
  }

  const balance = await planBalance(tx, plan.id);
  const remaining = plan.installments - balance.reservedInstallments;
  const requested = plan.installments === 1 ? 1 : input.requestedInstallments;
  if (remaining <= 0) {
    return { ok: false, message: "Este paquete ya está pagado o tiene todos sus pagos en revisión." };
  }
  if (requested < 1 || requested > remaining) {
    return {
      ok: false,
      message:
        remaining === plan.installments
          ? "Elige cuántas cuotas vas a pagar."
          : `Ya tienes pagos registrados para este paquete: te ${remaining === 1 ? "queda 1 cuota" : `quedan ${remaining} cuotas`}.`,
    };
  }

  return {
    ok: true,
    planId: plan.id,
    token,
    installmentsCovered: requested,
    amountCents: amountForInstallments(plan.priceCents, plan.installments, balance.reservedInstallments, requested),
    installments: plan.installments,
    priceCents: plan.priceCents,
    balance,
  };
}

/** The payment just stored plus the balance before it, as the receipt shows them. */
export function planReceipt(draft: Extract<PlanPaymentDraft, { ok: true }>, eurToVes: number | null): PlanReceipt {
  return {
    url: planUrl(draft.token),
    amountCents: draft.amountCents,
    eurToVes,
    installmentsCovered: draft.installmentsCovered,
    installments: draft.installments,
    priceCents: draft.priceCents,
    confirmedCents: draft.balance.confirmedCents,
    pendingCents: draft.balance.pendingCents + draft.amountCents,
  };
}

type LoadedPlan = {
  id: string;
  status: "open" | "paid";
  email: string | null;
  personName: string | null;
  packageId: string;
  packageName: string;
  priceCents: number;
  installments: number;
  formId: string;
  formSlug: string;
  formTitle: string;
  formFields: unknown;
  formVersion: number;
  eventName: string;
};

async function loadPlan(token: string): Promise<LoadedPlan | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await db
    .select({
      id: packagePlans.id,
      status: packagePlans.status,
      email: packagePlans.email,
      personName: packagePlans.personName,
      packageId: packagePlans.packageId,
      packageName: packagePlans.packageName,
      priceCents: packagePlans.priceCents,
      installments: packagePlans.installments,
      formId: forms.id,
      formSlug: forms.slug,
      formTitle: forms.title,
      formFields: forms.fields,
      formVersion: forms.version,
      eventName: events.name,
    })
    .from(packagePlans)
    .innerJoin(forms, eq(forms.id, packagePlans.formId))
    .innerJoin(events, eq(events.id, packagePlans.eventId))
    .where(eq(packagePlans.tokenHash, hashPlanToken(token)))
    .limit(1);
  return row ?? null;
}

/** The plan page's data. Null for an unknown or replaced link. */
export async function getPublicPlan(token: string): Promise<PublicPlan | null> {
  const plan = await loadPlan(token);
  if (!plan) return null;

  const [balance, payments, rate] = await Promise.all([
    planBalance(db, plan.id),
    db
      .select({
        submittedAt: formSubmissions.submittedAt,
        amountCents: formSubmissions.amountCents,
        installmentsCovered: formSubmissions.installmentsCovered,
        status: formSubmissions.paymentStatus,
        rejectionReason: formSubmissions.rejectionReason,
      })
      .from(formSubmissions)
      .where(eq(formSubmissions.planId, plan.id))
      .orderBy(asc(formSubmissions.submittedAt)),
    getLatestRate(),
  ]);

  return {
    formTitle: plan.formTitle,
    formSlug: plan.formSlug,
    eventName: plan.eventName,
    packageName: plan.packageName,
    personName: plan.personName,
    email: plan.email,
    priceCents: plan.priceCents,
    installments: plan.installments,
    status: plan.status,
    ...balance,
    payments: payments.map((payment) => ({
      submittedAt: payment.submittedAt,
      amountCents: payment.amountCents ?? 0,
      installmentsCovered: payment.installmentsCovered ?? 0,
      status: payment.status ?? "pending",
      rejectionReason: payment.rejectionReason,
    })),
    fields: planPaymentFields(formFieldsSchema.parse(plan.formFields)),
    eurToVes: rate?.eurToVes ?? null,
  };
}

export type PreparePlanUploadOutcome = PresignFileOutcome | { ok: false; reason: "not_found" | "paid" | "rate_limited" };

/** Presigned PUT for the proof of an abono, under the plan form's prefix. */
export async function preparePlanUpload(
  input: { token: string; draftId: string; fieldId: string; type: string; size: number },
  ip: string | null,
): Promise<PreparePlanUploadOutcome> {
  const plan = await loadPlan(input.token);
  if (!plan) return { ok: false, reason: "not_found" };
  if (plan.status !== "open") return { ok: false, reason: "paid" };
  if (!(await isUploadAllowed(ip))) return { ok: false, reason: "rate_limited" };

  const fields = planPaymentFields(formFieldsSchema.parse(plan.formFields));
  const outcome = await presignFormFile({
    formId: plan.formId,
    draftId: input.draftId,
    field: fields.find((field) => field.id === input.fieldId),
    type: input.type,
    size: input.size,
  });
  if (outcome.ok) await recordFormAttempt({ kind: "upload", formId: plan.formId, ip });
  return outcome;
}

export type SubmitPlanPaymentOutcome =
  | { ok: true; receipt: PlanReceipt }
  | { ok: false; reason: "not_found" | "paid" | "rate_limited" }
  | { ok: false; reason: "invalid"; message?: string; fieldErrors: Record<string, string> };

/**
 * An abono through the plan link: only the parts to pay, the reference and
 * the proof. Works while the plan is open, even if the form was closed to
 * new people. Stored like any package payment, pending review.
 */
export async function submitPlanPayment(
  input: { token: string; draftId: string; installments: number; answers: Record<string, unknown> },
  ip: string | null,
): Promise<SubmitPlanPaymentOutcome> {
  const plan = await loadPlan(input.token);
  if (!plan) return { ok: false, reason: "not_found" };
  if (plan.status !== "open") return { ok: false, reason: "paid" };

  const fields = planPaymentFields(formFieldsSchema.parse(plan.formFields));
  const parsed = buildAnswersSchema(fields, []).safeParse(input.answers);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, reason: "invalid", fieldErrors };
  }
  const answers = parsed.data as FormAnswers;
  if (!(await isSubmitAllowed(plan.formId, plan.email, ip))) return { ok: false, reason: "rate_limited" };

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
    const amountCents = amountForInstallments(plan.priceCents, plan.installments, balance.reservedInstallments, input.installments);
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

  if (!result.ok) return { ok: false, reason: "invalid", message: result.message, fieldErrors: { installments: result.message } };
  await recordFormAttempt({ kind: "submit", formId: plan.formId, ip, email: plan.email ?? undefined });

  const receipt: PlanReceipt = {
    url: planUrl(input.token),
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
    title: "Abono por revisar",
    body: `${plan.personName ?? plan.email ?? "Sin correo"} · ${plan.packageName} · ${formatEur(result.amountCents)}`,
    href: ADMIN_PATHS.packagePayment(result.submissionId),
  });
  if (plan.email) {
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
      },
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
    });
    const sent = await sendEmail({ to: plan.email, ...message });
    if (!sent) console.error("[plans] abono receipt email failed", { planId: plan.id });
  }

  return { ok: true, receipt };
}

/**
 * "Send me my link again": new links for every open plan of that email in
 * the form's event, by email only. Always looks like it worked, so the
 * page never tells whether an address has a plan.
 */
export async function resendPlanLinks(input: { slug: string; email: string }, ip: string | null): Promise<"ok" | "rate_limited"> {
  const [form] = await db
    .select({ id: forms.id, eventId: forms.eventId, eventName: events.name })
    .from(forms)
    .innerJoin(events, eq(events.id, forms.eventId))
    .where(eq(forms.slug, input.slug))
    .limit(1);
  if (!form) return "ok";

  const perEmail = FORM_RATE_LIMITS.planLinksPerEmail;
  const perIp = FORM_RATE_LIMITS.planLinksPerIp;
  const [byEmail, byIp] = await Promise.all([
    countAttemptsSince("plan_link", perEmail.windowSeconds, { email: input.email }),
    ip ? countAttemptsSince("plan_link", perIp.windowSeconds, { ip }) : Promise.resolve(0),
  ]);
  if (byEmail >= perEmail.max || byIp >= perIp.max) return "rate_limited";
  await recordFormAttempt({ kind: "plan_link", formId: form.id, ip, email: input.email });

  const plans = await db
    .select({ id: packagePlans.id, packageName: packagePlans.packageName })
    .from(packagePlans)
    .where(
      and(eq(packagePlans.eventId, form.eventId), eq(packagePlans.email, input.email), eq(packagePlans.status, "open")),
    );
  if (plans.length === 0) return "ok";

  const links: { packageName: string; url: string }[] = [];
  for (const plan of plans) {
    const { token, tokenHash } = newPlanToken();
    await db.update(packagePlans).set({ tokenHash }).where(eq(packagePlans.id, plan.id));
    links.push({ packageName: plan.packageName, url: planUrl(token) });
  }
  const message = buildPlanLinksEmail({ eventName: form.eventName, plans: links, appUrl: getServerEnv().NEXT_PUBLIC_APP_URL });
  const sent = await sendEmail({ to: input.email, ...message });
  if (!sent) console.error("[plans] link email failed", { formId: form.id });
  return "ok";
}
