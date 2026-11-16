"use server";

import { revalidatePath } from "next/cache";

import { formFieldsSchema, validatePlanPaymentFields } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { PLANS_PATHS } from "@/modules/plans/lib/constants/plans.constants";
import { savePlanPaymentFields } from "@/modules/plans/lib/services/plan-payment-form.service";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { requireAdmin } from "../services/admin-access.service";

export type SavePlanPaymentFormResult =
  | { ok: true; message: string; updatedAt: Date }
  | { ok: false; message: string; issues?: { path: (string | number)[]; message: string }[] };

const INVALID = "Hay campos por corregir antes de guardar.";

/**
 * Configuración › Formulario de pagos: the questions every installment asks
 * in "Pagos". Same field schema as any form plus the payment rule; a
 * person-name mark means nothing here, so it is dropped.
 */
export async function savePlanPaymentFormAction(input: { fields: unknown }): Promise<SavePlanPaymentFormResult> {
  const admin = await requireAdmin();

  const parsed = formFieldsSchema.safeParse(input.fields);
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
        message: issue.message,
      })),
    };
  }
  const issues = validatePlanPaymentFields(parsed.data);
  if (issues.length > 0) return { ok: false, message: INVALID, issues };

  const fields = parsed.data.map((field) => ({ ...field, personName: undefined }) as FormField);
  const updatedAt = await savePlanPaymentFields(fields, admin.id);

  revalidatePath(ADMIN_PATHS.paymentForm);
  revalidatePath(PLANS_PATHS.list, "layout");
  return { ok: true, message: "Cambios guardados. Los próximos pagos ya usan estas preguntas.", updatedAt };
}
