import { z } from "zod";

import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

import { FORM_LIMITS, PLAN_LIMITS } from "../constants/forms.constants";

const slugSchema = z.string().regex(/^[a-z0-9]{6,40}$/);

/**
 * Random id the browser picks when the page opens; every file of that
 * submission sits under `forms/<formId>/<draftId>/`, so a submission can
 * only claim files uploaded from the same page.
 */
const draftIdSchema = z.uuid();

export const prepareFormUploadSchema = z.object({
  slug: slugSchema,
  draftId: draftIdSchema,
  fieldId: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  name: z.string().trim().min(1).max(255),
  type: z.string().min(1).max(100),
  size: z
    .number()
    .int()
    .positive({ error: "El archivo está vacío." })
    .max(FORM_LIMITS.maxFileMb * 1024 * 1024, {
      error: `El archivo pesa más de ${FORM_LIMITS.maxFileMb} MB.`,
    }),
});

const installmentsSchema = z.int().min(1).max(PLAN_LIMITS.maxInstallments);

/** `answers` is validated afterwards against the form's own schema. */
export const submitFormSchema = z.object({
  slug: slugSchema,
  draftId: draftIdSchema,
  answers: z.record(z.string(), z.unknown()),
  /** Parts of the package price paid now; checked against the plan. */
  installments: installmentsSchema.optional(),
  honeypot: z.string().max(500).optional(),
});

/** The plan link's token: 32 random bytes in base64url. */
const planTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const preparePlanUploadSchema = prepareFormUploadSchema.omit({ slug: true }).extend({ token: planTokenSchema });

export const submitPlanPaymentSchema = z.object({
  token: planTokenSchema,
  draftId: draftIdSchema,
  installments: installmentsSchema,
  answers: z.record(z.string(), z.unknown()),
});

export const resendPlanLinkSchema = z.object({
  slug: slugSchema,
  email: emailSchema,
});

export type PrepareFormUploadInput = z.infer<typeof prepareFormUploadSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
