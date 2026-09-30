import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, sum, type SQL } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms } from "@/common/lib/db/schema";
import { FORM_UPLOAD_PREFIX } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";

import type {
  PackagePaymentDetail,
  PackagePaymentExportRow,
  PackagePaymentFilters,
  PackagePaymentRow,
  PackagePaymentSummary,
} from "../types/package-payment.types";
import { answerText, fileAnswers, isImageName, likePattern } from "../utils/package-payment.util";

export const PACKAGE_PAYMENTS_PAGE_SIZE = 50;

/**
 * Read-only views of `form_submissions`. Nothing here exposes an R2 key:
 * files are addressed by (submission, field, index) and resolved by the
 * admin-only file route.
 */

function whereFor(filters: PackagePaymentFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.eventId) conditions.push(eq(forms.eventId, filters.eventId));
  if (filters.formId) conditions.push(eq(formSubmissions.formId, filters.formId));
  if (filters.packageId) conditions.push(eq(formSubmissions.packageId, filters.packageId));
  const query = filters.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(ilike(sql`${formSubmissions.email}::text`, pattern), ilike(formSubmissions.reference, pattern)) as SQL,
    );
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

const rowColumns = {
  id: formSubmissions.id,
  submittedAt: formSubmissions.submittedAt,
  email: formSubmissions.email,
  reference: formSubmissions.reference,
  packageName: formSubmissions.packageName,
  packagePriceCents: formSubmissions.packagePriceCents,
  formId: formSubmissions.formId,
  formTitle: forms.title,
  eventName: events.name,
};

/** Newest first, one page at a time. */
export async function listPackagePayments(
  filters: PackagePaymentFilters,
  page: number,
): Promise<{ rows: PackagePaymentRow[]; total: number }> {
  const where = whereFor(filters);
  const [rows, [totals]] = await Promise.all([
    db
      .select(rowColumns)
      .from(formSubmissions)
      .innerJoin(forms, eq(forms.id, formSubmissions.formId))
      .innerJoin(events, eq(events.id, forms.eventId))
      .where(where)
      .orderBy(desc(formSubmissions.submittedAt))
      .limit(PACKAGE_PAYMENTS_PAGE_SIZE)
      .offset((page - 1) * PACKAGE_PAYMENTS_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(formSubmissions)
      .innerJoin(forms, eq(forms.id, formSubmissions.formId))
      .where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

/**
 * Count and sum per package over the filtered answers, by the snapshot
 * name and price each person saw. Sums what people reported, not what
 * reached the bank: verification happens outside the app.
 */
export async function summarizePackagePayments(filters: PackagePaymentFilters): Promise<PackagePaymentSummary[]> {
  const rows = await db
    .select({
      packageName: formSubmissions.packageName,
      priceCents: formSubmissions.packagePriceCents,
      count: count(),
      totalCents: sum(formSubmissions.packagePriceCents),
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .where(whereFor(filters))
    .groupBy(formSubmissions.packageName, formSubmissions.packagePriceCents)
    .orderBy(asc(formSubmissions.packagePriceCents), asc(formSubmissions.packageName));
  return rows.map((row) => ({ ...row, totalCents: Number(row.totalCents ?? 0) }));
}

async function loadSubmission(id: string) {
  const [row] = await db
    .select({
      ...rowColumns,
      eventId: forms.eventId,
      formVersion: formSubmissions.formVersion,
      answers: formSubmissions.answers,
      fieldsSnapshot: formSubmissions.fieldsSnapshot,
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .innerJoin(events, eq(events.id, forms.eventId))
    .where(eq(formSubmissions.id, id))
    .limit(1);
  return row ?? null;
}

function parseSnapshot(value: unknown): FormField[] {
  // Stored after validation; a failure means a corrupted row, so show nothing rather than crash.
  const parsed = formFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function answersRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Every answer in the order the person saw the questions. */
export async function getPackagePayment(id: string): Promise<PackagePaymentDetail | null> {
  const row = await loadSubmission(id);
  if (!row) return null;

  const answers = answersRecord(row.answers);
  return {
    id: row.id,
    submittedAt: row.submittedAt,
    email: row.email,
    reference: row.reference,
    packageName: row.packageName,
    packagePriceCents: row.packagePriceCents,
    formId: row.formId,
    formTitle: row.formTitle,
    eventName: row.eventName,
    eventId: row.eventId,
    formVersion: row.formVersion,
    answers: parseSnapshot(row.fieldsSnapshot).map((field) => ({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      text: answerText(field, answers[field.id], row.packageName),
      files:
        field.type === "file"
          ? fileAnswers(answers[field.id]).map((file, index) => ({
              index,
              name: file.name,
              isImage: isImageName(file.key),
            }))
          : [],
    })),
  };
}

/** R2 key of one file answer, only if it sits under the forms prefix. */
export async function getPackagePaymentFileKey(id: string, fieldId: string, index: number): Promise<string | null> {
  const [row] = await db
    .select({ answers: formSubmissions.answers })
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!row) return null;
  const file = fileAnswers(answersRecord(row.answers)[fieldId])[index];
  if (!file || !file.key.startsWith(`${FORM_UPLOAD_PREFIX}/`)) return null;
  return file.key;
}

/** Everything matching the filters, oldest first, for the spreadsheet. */
export async function listPackagePaymentsForExport(filters: PackagePaymentFilters): Promise<PackagePaymentExportRow[]> {
  const rows = await db
    .select({ ...rowColumns, answers: formSubmissions.answers, fieldsSnapshot: formSubmissions.fieldsSnapshot })
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .innerJoin(events, eq(events.id, forms.eventId))
    .where(whereFor(filters))
    .orderBy(asc(formSubmissions.submittedAt));

  return rows.map(({ answers, fieldsSnapshot, ...row }) => ({
    ...row,
    answers: answersRecord(answers),
    fields: parseSnapshot(fieldsSnapshot),
  }));
}
