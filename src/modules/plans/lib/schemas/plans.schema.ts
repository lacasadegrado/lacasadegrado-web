import { z } from "zod";

import { FORM_LIMITS, PLAN_LIMITS } from "@/modules/forms/lib/constants/forms.constants";

import { PLAN_PAYMENT_METHOD_IDS } from "../constants/plans.constants";

/**
 * Random id the page picks when it opens; the proof sits under
 * `forms/<formId>/<draftId>/`, so a payment can only claim files uploaded
 * from the same page.
 */
const draftIdSchema = z.uuid();

export const preparePlanUploadSchema = z.object({
  planId: z.uuid(),
  draftId: draftIdSchema,
  fieldId: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  name: z.string().trim().min(1).max(255),
  type: z.string().min(1).max(100),
  size: z
    .number()
    .int()
    .positive({ error: "El archivo está vacío." })
    .max(FORM_LIMITS.maxFileMb * 1024 * 1024, { error: `El archivo pesa más de ${FORM_LIMITS.maxFileMb} MB.` }),
});

/** `answers` is validated afterwards against the current payment questions (`getPlanPaymentFields`). */
export const submitPlanPaymentSchema = z.object({
  planId: z.uuid(),
  draftId: draftIdSchema,
  installments: z.int().min(1).max(PLAN_LIMITS.maxInstallments),
  method: z.enum(PLAN_PAYMENT_METHOD_IDS, { error: "Elige arriba cómo pagaste." }),
  answers: z.record(z.string(), z.unknown()),
});

export type PreparePlanUploadInput = z.infer<typeof preparePlanUploadSchema>;
export type SubmitPlanPaymentInput = z.infer<typeof submitPlanPaymentSchema>;
