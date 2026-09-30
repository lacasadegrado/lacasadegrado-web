import "server-only";

import { randomBytes } from "node:crypto";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, photoPackages, type FormStatus } from "@/common/lib/db/schema";
import { deleteObjects, listObjects } from "@/common/lib/storage/storage.service";
import { FORM_UPLOAD_PREFIX } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { createDefaultFormFields } from "@/modules/forms/lib/utils/form-fields.util";

import type { AdminFormDetail, AdminFormSummary } from "../types/form-admin.types";

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SLUG_LENGTH = 10;

/**
 * Public path segment: 10 characters from an alphabet without look-alikes
 * (no l, o, 0, 1), about 50 bits, so a link cannot be guessed.
 */
function newFormSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH);
  return Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join("");
}

export async function listFormsForEvent(eventId: string): Promise<AdminFormSummary[]> {
  return db
    .select({
      id: forms.id,
      title: forms.title,
      slug: forms.slug,
      status: forms.status,
      updatedAt: forms.updatedAt,
      submissionCount: count(formSubmissions.id),
    })
    .from(forms)
    .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
    .where(eq(forms.eventId, eventId))
    .groupBy(forms.id)
    .orderBy(desc(forms.createdAt));
}

/** Starts as a draft with the default fields; the admin edits it next. */
export async function createForm(input: {
  eventId: string;
  title: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(forms)
    .values({
      eventId: input.eventId,
      title: input.title,
      slug: newFormSlug(),
      fields: createDefaultFormFields(),
      createdBy: input.createdBy,
    })
    .returning({ id: forms.id });
  return row;
}

export async function getFormForBuilder(formId: string): Promise<AdminFormDetail | null> {
  const [row] = await db
    .select({
      id: forms.id,
      eventId: forms.eventId,
      eventName: events.name,
      title: forms.title,
      description: forms.description,
      slug: forms.slug,
      status: forms.status,
      fields: forms.fields,
      version: forms.version,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .innerJoin(events, eq(events.id, forms.eventId))
    .where(eq(forms.id, formId))
    .limit(1);
  if (!row) return null;

  const [[submissions], [packages]] = await Promise.all([
    db.select({ total: count() }).from(formSubmissions).where(eq(formSubmissions.formId, formId)),
    db
      .select({ total: count() })
      .from(photoPackages)
      .where(and(eq(photoPackages.eventId, row.eventId), eq(photoPackages.isActive, true))),
  ]);

  return {
    ...row,
    // Stored definitions always passed this schema on save; parse anyway.
    fields: formFieldsSchema.parse(row.fields),
    submissionCount: submissions?.total ?? 0,
    activePackageCount: packages?.total ?? 0,
  };
}

/**
 * Saves the builder. The version only moves when the fields changed, so
 * renaming the form does not look like a new version to the export.
 */
export async function saveForm(
  formId: string,
  input: { title: string; description: string | null; fields: FormField[] },
): Promise<{ version: number; eventId: string } | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ fields: forms.fields, version: forms.version, eventId: forms.eventId })
      .from(forms)
      .where(eq(forms.id, formId))
      .for("update")
      .limit(1);
    if (!current) return null;

    // jsonb reorders keys; parsing both through the schema gives the same order.
    const fieldsChanged =
      JSON.stringify(formFieldsSchema.parse(current.fields)) !==
      JSON.stringify(formFieldsSchema.parse(input.fields));
    const version = fieldsChanged ? current.version + 1 : current.version;
    await tx
      .update(forms)
      .set({ title: input.title, description: input.description, fields: input.fields, version })
      .where(eq(forms.id, formId));
    return { version, eventId: current.eventId };
  });
}

export type SetFormStatusResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "not_found" | "no_packages" };

/** Opening needs at least one active package, or the select would be empty. */
export async function setFormStatus(formId: string, status: FormStatus): Promise<SetFormStatusResult> {
  const [form] = await db
    .select({ eventId: forms.eventId })
    .from(forms)
    .where(eq(forms.id, formId))
    .limit(1);
  if (!form) return { ok: false, reason: "not_found" };

  if (status === "open") {
    const [packages] = await db
      .select({ total: count() })
      .from(photoPackages)
      .where(and(eq(photoPackages.eventId, form.eventId), eq(photoPackages.isActive, true)));
    if ((packages?.total ?? 0) === 0) return { ok: false, reason: "no_packages" };
  }

  await db.update(forms).set({ status }).where(eq(forms.id, formId));
  return { ok: true, eventId: form.eventId };
}

export type DeleteFormResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "not_found" | "has_submissions" };

/**
 * A form with answers is closed, never deleted: the answers depend on it.
 * Without answers, every file under its prefix was abandoned mid-form, so
 * those go too. Storage errors are logged, never block the delete; the
 * cleanup script catches anything left behind.
 */
export async function deleteForm(formId: string): Promise<DeleteFormResult> {
  const [row] = await db
    .select({ eventId: forms.eventId, submissionCount: count(formSubmissions.id) })
    .from(forms)
    .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
    .where(eq(forms.id, formId))
    .groupBy(forms.id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.submissionCount > 0) return { ok: false, reason: "has_submissions" };

  await db.delete(forms).where(eq(forms.id, formId));

  try {
    const keys = (await listObjects(`${FORM_UPLOAD_PREFIX}/${formId}/`)).map((object) => object.key);
    const failed = keys.length > 0 ? await deleteObjects(keys) : [];
    if (failed.length > 0) console.error("[forms] orphaned uploads after form delete", { formId, failed: failed.length });
  } catch (error) {
    console.error("[forms] could not clean uploads after form delete", { formId, error });
  }
  return { ok: true, eventId: row.eventId };
}
