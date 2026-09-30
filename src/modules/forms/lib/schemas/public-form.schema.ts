import { z } from "zod";

import { FORM_LIMITS } from "../constants/forms.constants";

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

/** `answers` is validated afterwards against the form's own schema. */
export const submitFormSchema = z.object({
  slug: slugSchema,
  draftId: draftIdSchema,
  answers: z.record(z.string(), z.unknown()),
  honeypot: z.string().max(500).optional(),
});

export type PrepareFormUploadInput = z.infer<typeof prepareFormUploadSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
