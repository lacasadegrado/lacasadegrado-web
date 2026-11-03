import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, packagePlans, profiles } from "@/common/lib/db/schema";
import { FORM_UPLOAD_PREFIX } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { visibleFieldIds } from "@/modules/forms/lib/utils/form-conditions.util";
import { personNameFrom } from "@/modules/forms/lib/utils/person-name.util";

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
  if (filters.kind) conditions.push(eq(forms.kind, filters.kind));
  if (filters.paymentStatus) conditions.push(eq(formSubmissions.paymentStatus, filters.paymentStatus));
  const query = filters.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(ilike(sql`${formSubmissions.email}::text`, pattern), ilike(formSubmissions.reference, pattern)) as SQL,
    );
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Selected server-side only; `toRow` turns proofKey into a boolean before anything leaves. */
const rowColumns = {
  id: formSubmissions.id,
  submittedAt: formSubmissions.submittedAt,
  email: formSubmissions.email,
  reference: formSubmissions.reference,
  packageName: formSubmissions.packageName,
  packagePriceCents: formSubmissions.packagePriceCents,
  proofKey: formSubmissions.proofKey,
  formId: formSubmissions.formId,
  formKind: forms.kind,
  formTitle: forms.title,
  eventName: events.name,
  answers: formSubmissions.answers,
  fieldsSnapshot: formSubmissions.fieldsSnapshot,
  paymentStatus: formSubmissions.paymentStatus,
  amountCents: formSubmissions.amountCents,
  installmentsCovered: formSubmissions.installmentsCovered,
  planInstallments: packagePlans.installments,
  planPersonName: packagePlans.personName,
  planId: formSubmissions.planId,
  eurToVes: formSubmissions.eurToVes,
  rejectionReason: formSubmissions.rejectionReason,
  reviewedAt: formSubmissions.reviewedAt,
};

type RawRow = {
  id: string;
  submittedAt: Date;
  email: string | null;
  reference: string | null;
  packageName: string | null;
  packagePriceCents: number | null;
  proofKey: string | null;
  formId: string;
  formKind: PackagePaymentRow["formKind"];
  formTitle: string;
  eventName: string;
  answers: unknown;
  fieldsSnapshot: unknown;
  paymentStatus: PackagePaymentRow["paymentStatus"];
  amountCents: number | null;
  installmentsCovered: number | null;
  planInstallments: number | null;
  planPersonName: string | null;
  planId: string | null;
  eurToVes: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
};

/** The list row plus the parsed answers and fields, kept apart so lists never carry them. */
function toRow(raw: RawRow): { row: PackagePaymentRow; answers: Record<string, unknown>; fields: FormField[] } {
  const answers = answersRecord(raw.answers);
  const fields = parseSnapshot(raw.fieldsSnapshot);
  const row: PackagePaymentRow = {
    id: raw.id,
    submittedAt: raw.submittedAt,
    email: raw.email,
    reference: raw.reference,
    packageName: raw.packageName,
    packagePriceCents: raw.packagePriceCents,
    // Abonos only ask for reference and proof: the name comes from the plan.
    personName: personNameFrom(fields, answers) ?? raw.planPersonName,
    hasProof: raw.proofKey !== null,
    formId: raw.formId,
    formKind: raw.formKind,
    formTitle: raw.formTitle,
    eventName: raw.eventName,
    paymentStatus: raw.paymentStatus,
    amountCents: raw.amountCents,
    installmentsCovered: raw.installmentsCovered,
    planInstallments: raw.planInstallments,
    planId: raw.planId,
    eurToVes: raw.eurToVes ? Number(raw.eurToVes) : null,
    rejectionReason: raw.rejectionReason,
    reviewedAt: raw.reviewedAt,
  };
  return { row, answers, fields };
}

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
      .leftJoin(packagePlans, eq(packagePlans.id, formSubmissions.planId))
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
  // Lists never carry answers or fields; only the export and detail do.
  return { rows: rows.map((raw) => toRow(raw).row), total: totals?.total ?? 0 };
}

/**
 * Count and sum per package over the filtered answers, by the snapshot
 * name and price each person saw. A payment's own amount when it has one
 * (abonos), else the package price; rejected payments never count, and
 * only confirmed ones are money that arrived.
 */
export async function summarizePackagePayments(filters: PackagePaymentFilters): Promise<PackagePaymentSummary[]> {
  const rows = await db
    .select({
      packageName: formSubmissions.packageName,
      priceCents: formSubmissions.packagePriceCents,
      count: count(),
      totalCents: sql<number>`coalesce(sum(coalesce(${formSubmissions.amountCents}, ${formSubmissions.packagePriceCents})) filter (where ${formSubmissions.paymentStatus} is distinct from 'rejected'), 0)::int`,
      confirmedCents: sql<number>`coalesce(sum(coalesce(${formSubmissions.amountCents}, ${formSubmissions.packagePriceCents})) filter (where ${formSubmissions.paymentStatus} = 'confirmed'), 0)::int`,
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .where(whereFor(filters))
    .groupBy(formSubmissions.packageName, formSubmissions.packagePriceCents)
    .orderBy(asc(formSubmissions.packagePriceCents), asc(formSubmissions.packageName));
  return rows;
}

async function loadSubmission(id: string) {
  const [row] = await db
    .select({
      ...rowColumns,
      eventId: forms.eventId,
      formVersion: formSubmissions.formVersion,
      reviewedByEmail: profiles.email,
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .innerJoin(events, eq(events.id, forms.eventId))
    .leftJoin(packagePlans, eq(packagePlans.id, formSubmissions.planId))
    .leftJoin(profiles, eq(profiles.id, formSubmissions.reviewedBy))
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

  const { row: base, answers, fields } = toRow(row);
  // Questions a condition hid from this person are left out, not shown as empty.
  const visible = visibleFieldIds(fields, answers);
  return {
    ...base,
    eventId: row.eventId,
    formVersion: row.formVersion,
    reviewedByEmail: row.reviewedByEmail,
    answers: fields.filter((field) => visible.has(field.id)).map((field) => ({
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
    .select(rowColumns)
    .from(formSubmissions)
    .innerJoin(forms, eq(forms.id, formSubmissions.formId))
    .innerJoin(events, eq(events.id, forms.eventId))
    .leftJoin(packagePlans, eq(packagePlans.id, formSubmissions.planId))
    .where(whereFor(filters))
    .orderBy(asc(formSubmissions.submittedAt));

  return rows.map((raw) => {
    const { row, answers, fields } = toRow(raw);
    return { ...row, answers, fields };
  });
}
