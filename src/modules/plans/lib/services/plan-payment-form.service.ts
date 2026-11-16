import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/common/lib/db";
import { planPaymentForm } from "@/common/lib/db/schema";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { PLAN_PAYMENT_FIELDS } from "@/modules/forms/lib/utils/form-fields.util";

export type PlanPaymentFormSettings = {
  fields: FormField[];
  /** Null while the default questions apply (never saved). */
  updatedAt: Date | null;
};

/**
 * The questions every installment asks in "Pagos" (one global form). A
 * row that no longer parses falls back to the defaults instead of
 * breaking payments, and is logged. Cached per request.
 */
export const getPlanPaymentForm = cache(async (): Promise<PlanPaymentFormSettings> => {
  const [row] = await db.select().from(planPaymentForm).where(eq(planPaymentForm.id, 1)).limit(1);
  if (!row) return { fields: PLAN_PAYMENT_FIELDS, updatedAt: null };
  const parsed = formFieldsSchema.safeParse(row.fields);
  if (!parsed.success) {
    console.error("[plans] plan_payment_form does not parse; using the defaults", parsed.error.issues[0]);
    return { fields: PLAN_PAYMENT_FIELDS, updatedAt: null };
  }
  return { fields: parsed.data as FormField[], updatedAt: row.updatedAt };
});

export async function getPlanPaymentFields(): Promise<FormField[]> {
  return (await getPlanPaymentForm()).fields;
}

/** Saves the questions (already validated by the caller). */
export async function savePlanPaymentFields(fields: FormField[], adminId: string): Promise<Date> {
  const [row] = await db
    .insert(planPaymentForm)
    .values({ id: 1, fields, updatedBy: adminId })
    .onConflictDoUpdate({ target: planPaymentForm.id, set: { fields, updatedBy: adminId, updatedAt: new Date() } })
    .returning({ updatedAt: planPaymentForm.updatedAt });
  return row.updatedAt;
}
