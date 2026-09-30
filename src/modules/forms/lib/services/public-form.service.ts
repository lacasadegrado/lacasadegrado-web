import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";

import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, photoPackages } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { getPresignedPutUrl, headObject } from "@/common/lib/storage/storage.service";

import {
  FORM_FILE_ACCEPT,
  FORM_FILE_EXTENSIONS,
  FORM_UPLOAD,
  FORM_UPLOAD_PREFIX,
} from "../constants/forms.constants";
import { buildAnswersSchema } from "../schemas/form-answers.schema";
import { formFieldsSchema } from "../schemas/form-field.schema";
import type { PrepareFormUploadInput } from "../schemas/public-form.schema";
import type { FormAnswers, FormField, FormFileAnswer } from "../types/form.types";
import type { PublicForm } from "../types/public-form.types";
import { buildFormSubmittedEmail } from "../utils/form-email.util";
import { isSubmitAllowed, isUploadAllowed, recordFormAttempt } from "./form-rate-limit.service";

type LoadedForm = PublicForm & { id: string; version: number };

async function loadForm(slug: string): Promise<LoadedForm | null> {
  const [row] = await db
    .select({
      id: forms.id,
      slug: forms.slug,
      title: forms.title,
      description: forms.description,
      status: forms.status,
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
    })
    .from(photoPackages)
    .where(and(eq(photoPackages.eventId, row.eventId), eq(photoPackages.isActive, true)))
    .orderBy(asc(photoPackages.sortOrder), asc(photoPackages.priceCents), asc(photoPackages.createdAt));

  return {
    id: row.id,
    version: row.version,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    eventName: row.eventName,
    institution: row.institution,
    eventDate: row.eventDate,
    fields: formFieldsSchema.parse(row.fields),
    packages,
  };
}

/**
 * The page's data, without the internal form id and version. Cached per
 * request: the metadata and the page both read it.
 */
export const getPublicForm = cache(async (slug: string): Promise<PublicForm | null> => {
  const form = await loadForm(slug);
  if (!form) return null;
  return {
    slug: form.slug,
    title: form.title,
    description: form.description,
    status: form.status,
    eventName: form.eventName,
    institution: form.institution,
    eventDate: form.eventDate,
    fields: form.fields,
    packages: form.packages,
  };
});

function draftPrefix(formId: string, draftId: string, fieldId: string): string {
  return `${FORM_UPLOAD_PREFIX}/${formId}/${draftId}/${fieldId}/`;
}

function acceptedTypes(field: Extract<FormField, { type: "file" }>): readonly string[] {
  return FORM_FILE_ACCEPT[field.accept];
}

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
  if (!acceptedTypes(field).includes(input.type)) return { ok: false, reason: "bad_type" };
  if (input.size > field.maxSizeMb * 1024 * 1024) return { ok: false, reason: "too_large" };
  if (!(await isUploadAllowed(ip))) return { ok: false, reason: "rate_limited" };

  const extension = FORM_FILE_EXTENSIONS[input.type] ?? "bin";
  const key = `${draftPrefix(form.id, input.draftId, field.id)}${randomUUID()}.${extension}`;
  const uploadUrl = await getPresignedPutUrl(key, {
    contentType: input.type,
    expiresInSeconds: FORM_UPLOAD.uploadUrlTtlSeconds,
  });
  await recordFormAttempt({ kind: "upload", formId: form.id, ip });
  return { ok: true, key, uploadUrl };
}

/**
 * A file answer is only accepted when its key sits under this draft's
 * prefix for that field (so nobody can claim another upload) and the
 * stored object has an allowed type and size.
 */
async function verifyFiles(
  formId: string,
  draftId: string,
  field: Extract<FormField, { type: "file" }>,
  files: FormFileAnswer[],
): Promise<boolean> {
  const prefix = draftPrefix(formId, draftId, field.id);
  const maxBytes = field.maxSizeMb * 1024 * 1024;
  for (const file of files) {
    if (!file.key.startsWith(prefix) || file.key.includes("..")) return false;
    const info = await headObject(file.key);
    if (!info || info.size === 0 || info.size > maxBytes) return false;
    if (!acceptedTypes(field).includes(info.contentType ?? "")) return false;
  }
  return true;
}

export type SubmitFormOutcome =
  | { ok: true; packageName: string; priceCents: number; reference: string; email: string }
  | { ok: false; reason: "not_found" | "not_open" | "rate_limited" }
  | { ok: false; reason: "invalid"; fieldErrors: Record<string, string> };

/**
 * Validates the answers against the form's current fields and active
 * packages, checks the files, stores the submission with snapshots of
 * the fields and the package, and emails a receipt. The receipt failing
 * never fails the submission.
 */
export async function submitPublicForm(
  input: { slug: string; draftId: string; answers: Record<string, unknown> },
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

  // The system fields always exist and are required, so these are set.
  const email = answers.email as string;
  const packageId = answers.package as string;
  const reference = answers.reference as string;
  const proof = answers.proof as FormFileAnswer[];

  if (!(await isSubmitAllowed(form.id, email, ip))) return { ok: false, reason: "rate_limited" };

  const fieldErrors: Record<string, string> = {};
  for (const field of form.fields) {
    const value = answers[field.id];
    if (field.type !== "file" || !Array.isArray(value)) continue;
    if (!(await verifyFiles(form.id, input.draftId, field, value as FormFileAnswer[]))) {
      fieldErrors[field.id] = "No pudimos verificar el archivo. Vuelve a adjuntarlo.";
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, reason: "invalid", fieldErrors };

  const chosen = form.packages.find((option) => option.id === packageId);
  if (!chosen) return { ok: false, reason: "invalid", fieldErrors: { package: "Elige un paquete de la lista." } };

  await db.insert(formSubmissions).values({
    formId: form.id,
    packageId: chosen.id,
    packageName: chosen.name,
    packagePriceCents: chosen.priceCents,
    email,
    reference,
    proofKey: proof[0].key,
    answers,
    fieldsSnapshot: form.fields,
    formVersion: form.version,
  });
  await recordFormAttempt({ kind: "submit", formId: form.id, ip, email });

  const receipt = buildFormSubmittedEmail({
    formTitle: form.title,
    eventName: form.eventName,
    packageName: chosen.name,
    priceCents: chosen.priceCents,
    reference,
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: email, ...receipt });
  if (!sent) console.error("[forms] receipt email failed", { formId: form.id });

  return { ok: true, packageName: chosen.name, priceCents: chosen.priceCents, reference, email };
}
