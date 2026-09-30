import { z } from "zod";

import { formStatusEnum } from "@/common/lib/db/schema/enums.table";
import { FORM_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";

const priceEurSchema = z.coerce
  .number({ error: "Escribe un precio válido." })
  .min(0, { error: "El precio no puede ser negativo." })
  .max(10_000, { error: "El precio es demasiado alto." });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

export const createPackageSchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(2, { error: "Escribe el nombre del paquete." }).max(120),
  description: optionalText(500),
  priceEur: priceEurSchema,
});

export const updatePackageSchema = createPackageSchema.omit({ eventId: true }).extend({
  packageId: z.uuid(),
});

export const packageIdSchema = z.object({ packageId: z.uuid() });

export const setPackageActiveSchema = z.object({
  packageId: z.uuid(),
  isActive: z.boolean(),
});

export const createFormSchema = z.object({
  eventId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(3, { error: "Escribe un título de al menos 3 caracteres." })
    .max(FORM_LIMITS.titleMax),
});

export const saveFormSchema = z.object({
  formId: z.uuid(),
  title: createFormSchema.shape.title,
  description: optionalText(FORM_LIMITS.descriptionMax),
  fields: formFieldsSchema,
});

export const setFormStatusSchema = z.object({
  formId: z.uuid(),
  status: z.enum(formStatusEnum.enumValues),
});

export const formIdSchema = z.object({ formId: z.uuid() });

export type SaveFormInput = z.input<typeof saveFormSchema>;
