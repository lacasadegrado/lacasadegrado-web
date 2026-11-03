import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";

import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, photoPackages } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { formatEur } from "@/common/lib/utils/money.util";
import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";
import { notifyAdmins } from "@/modules/admin/lib/services/notification.service";
import { getCurrentRate, getLatestRate } from "@/modules/checkout/lib/services/exchange-rate.service";

import { buildAnswersSchema } from "../schemas/form-answers.schema";
import { formFieldsSchema } from "../schemas/form-field.schema";
import type { PrepareFormUploadInput } from "../schemas/public-form.schema";
import type { FormAnswers, FormFileAnswer } from "../types/form.types";
import type { PublicForm, SubmitReceipt } from "../types/public-form.types";
import { buildFormSubmittedEmail } from "../utils/form-email.util";
import { personNameFrom } from "../utils/person-name.util";
import { presignFormFile, verifyFileAnswers } from "./form-files.service";
import { isSubmitAllowed, isUploadAllowed, recordFormAttempt } from "./form-rate-limit.service";
import { planReceipt, preparePlanForPayment } from "./package-plan.service";

type LoadedForm = Omit<PublicForm, "eurToVes"> & { id: string; version: number; eventId: string };

async function loadForm(slug: string): Promise<LoadedForm | null> {
  const [row] = await db
    .select({
      id: forms.id,
      slug: forms.slug,
      title: forms.title,
      description: forms.description,
      status: forms.status,
      kind: forms.kind,
      fields: forms.fields,
      version: forms.version,
      eventId: forms.eventId,
      eventName: events.name,
      institution: events.institution,
      eventDate: events.eventDate,
    })
    .from(forms)
    .innerJoin(events, eq(events.id, forms.eventId))
    .where(eq(forms.slug, slug))
    .limit(1);
  if (!row) return null;

  const packages = await db
    .select({
      id: photoPackages.id,
      name: photoPackages.name,
      description: photoPackages.description,
      priceCents: photoPackages.priceCents,
      installments: photoPackages.installments,
    })
    .from(photoPackages)
    .where(and(eq(photoPackages.eventId, row.eventId), eq(photoPackages.isActive, true)))
    .orderBy(asc(photoPackages.sortOrder), asc(photoPackages.priceCents), asc(photoPackages.createdAt));

  return {
    id: row.id,
    version: row.version,
    eventId: row.eventId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    kind: row.kind,
    eventName: row.eventName,
    institution: row.institution,
    eventDate: row.eventDate,
    fields: formFieldsSchema.parse(row.fields),
    packages,
  };
}

/**
 * The page's data, without the internal form id and version. Cached per
 * request: the metadata and the page both read it. The rate is the last
 * stored one, for showing bolívares; submitting uses the day's rate.
 */
export const getPublicForm = cache(async (slug: string): Promise<PublicForm | null> => {
  const form = await loadForm(slug);
  if (!form) return null;
  const rate = form.kind === "package_payment" ? await getLatestRate() : null;
  return {
    slug: form.slug,
    title: form.title,
    description: form.description,
    status: form.status,
    kind: form.kind,
    eventName: form.eventName,
    institution: form.institution,
    eventDate: form.eventDate,
    fields: form.fields,
    packages: form.packages,
    eurToVes: rate?.eurToVes ?? null,
  };
});

export type PrepareFormUploadOutcome =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; reason: "not_found" | "not_open" | "bad_field" | "bad_type" | "too_large" | "rate_limited" };

/** Presigned PUT for one file of one file field of an open form. */
export async function prepareFormUpload(
  input: PrepareFormUploadInput,
  ip: string | null,
): Promise<PrepareFormUploadOutcome> {
  const form = await loadForm(input.slug);
  if (!form) return { ok: false, reason: "not_found" };
  if (form.status !== "open") return { ok: false, reason: "not_open" };

  const field = form.fields.find((item) => item.id === input.fieldId);
  if (!field || field.type !== "file") return { ok: false, reason: "bad_field" };
  if (!(await isUploadAllowed(ip))) return { ok: false, reason: "rate_limited" };

  const outcome = await presignFormFile({ formId: form.id, draftId: input.draftId, field, type: input.type, size: input.size });
  if (outcome.ok) await recordFormAttempt({ kind: "upload", formId: form.id, ip });
  return outcome;
}

export type SubmitFormOutcome =
  | { ok: true; receipt: SubmitReceipt }
  | { ok: false; reason: "not_found" | "not_open" | "rate_limited" }
  | { ok: false; reason: "invalid"; fieldErrors: Record<string, string> };

/**
 * Validates the answers against the form's current fields and active
 * packages, checks the files and stores the submission with snapshots of
 * the fields and the package. A package payment joins the person's
 * payment plan (new, or their open one for that package and email) for
 * the parts they chose, pending review. Emails a receipt when there is
 * an email and tells the admins. Any system field may be absent (general
 * forms) or left empty (the admin made it optional). The receipt failing
 * never fails the submission.
 */
export async function submitPublicForm(
  input: { slug: string; draftId: string; answers: Record<string, unknown>; installments?: number },
  ip: string | null,
): Promise<SubmitFormOutcome> {
  const form = await loadForm(input.slug);
  if (!form) return { ok: false, reason: "not_found" };
  if (form.status !== "open") return { ok: false, reason: "not_open" };

  const parsed = buildAnswersSchema(form.fields, form.packages).safeParse(input.answers);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, reason: "invalid", fieldErrors };
  }
  const answers = parsed.data as FormAnswers;

  // System fields may be missing or empty: the schema already checked types.
  const email = typeof answers.email === "string" ? answers.email : null;
  const packageId = typeof answers.package === "string" ? answers.package : null;
  const reference = typeof answers.reference === "string" ? answers.reference : null;
  const proof = Array.isArray(answers.proof) ? (answers.proof as FormFileAnswer[]) : [];

  if (!(await isSubmitAllowed(form.id, email, ip))) return { ok: false, reason: "rate_limited" };

  const fileErrors = await verifyFileAnswers(form.id, input.draftId, form.fields, answers);
  if (Object.keys(fileErrors).length > 0) return { ok: false, reason: "invalid", fieldErrors: fileErrors };

  const chosen = packageId ? form.packages.find((option) => option.id === packageId) : undefined;
  if (packageId && !chosen) {
    return { ok: false, reason: "invalid", fieldErrors: { package: "Elige un paquete de la lista." } };
  }

  const isPayment = form.kind === "package_payment";
  const personName = personNameFrom(form.fields, answers);
  const rate = isPayment && chosen ? await getCurrentRate() : null;

  const stored = await db.transaction(async (tx) => {
    const draft = chosen
      ? await preparePlanForPayment(tx, {
          eventId: form.eventId,
          formId: form.id,
          pkg: chosen,
          email,
          personName,
          requestedInstallments: input.installments ?? 1,
        })
      : null;
    if (draft && !draft.ok) return { ok: false as const, message: draft.message };

    const [row] = await tx
      .insert(formSubmissions)
      .values({
        formId: form.id,
        packageId: chosen?.id ?? null,
        packageName: chosen?.name ?? null,
        packagePriceCents: chosen?.priceCents ?? null,
        email,
        reference,
        proofKey: proof[0]?.key ?? null,
        answers,
        fieldsSnapshot: form.fields,
        formVersion: form.version,
        // Every payment form answer waits for review, with or without a package.
        paymentStatus: isPayment ? "pending" : null,
        ...(draft?.ok
          ? {
              planId: draft.planId,
              installmentsCovered: draft.installmentsCovered,
              amountCents: draft.amountCents,
              eurToVes: rate ? rate.eurToVes.toFixed(4) : null,
            }
          : {}),
      })
      .returning({ id: formSubmissions.id });
    return { ok: true as const, submissionId: row.id, draft };
  });
  if (!stored.ok) return { ok: false, reason: "invalid", fieldErrors: { installments: stored.message } };
  await recordFormAttempt({ kind: "submit", formId: form.id, ip, email: email ?? undefined });

  const receipt: SubmitReceipt = {
    kind: form.kind,
    packageName: chosen?.name ?? null,
    priceCents: chosen?.priceCents ?? null,
    reference,
    email,
    plan: stored.draft?.ok ? planReceipt(stored.draft, rate?.eurToVes ?? null) : null,
  };

  if (isPayment) {
    await notifyAdmins({
      kind: "package_payment",
      title: "Pago de paquete por revisar",
      body: [personName ?? email ?? "Sin correo", chosen?.name, receipt.plan ? formatEur(receipt.plan.amountCents) : null]
        .filter(Boolean)
        .join(" · "),
      href: ADMIN_PATHS.packagePayment(stored.submissionId),
    });
  }
  if (email) {
    const message = buildFormSubmittedEmail({
      formTitle: form.title,
      eventName: form.eventName,
      receipt,
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
    });
    const sent = await sendEmail({ to: email, ...message });
    if (!sent) console.error("[forms] receipt email failed", { formId: form.id });
  }

  return { ok: true, receipt };
}
