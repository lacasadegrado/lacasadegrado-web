import { z } from "zod";

import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

import { BULK_LIMITS, PHOTO_UPLOAD } from "../constants/admin.constants";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: "Usa solo letras minúsculas, números y guiones.",
  })
  .max(80);

/** Checkbox inputs arrive as "on" or are absent. */
const checkboxSchema = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const createEventSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre del evento." }).max(120),
  institution: z
    .string()
    .trim()
    .min(2, { error: "Escribe la institución." })
    .max(120),
  eventDate: z.iso.date({ error: "Elige la fecha del evento." }),
  slug: slugSchema,
  isActive: checkboxSchema,
});

export const setEventActiveSchema = z.object({
  eventId: z.uuid(),
  isActive: checkboxSchema,
});

export const updateEventSchema = createEventSchema.extend({
  eventId: z.uuid(),
});

export const deleteEventSchema = z.object({
  eventId: z.uuid(),
});

const priceEurSchema = z.coerce
  .number({ error: "Escribe un precio válido." })
  .min(0, { error: "El precio no puede ser negativo." })
  .max(10_000, { error: "El precio es demasiado alto." });

export const updatePhotoPriceSchema = z.object({
  photoId: z.uuid(),
  priceEur: priceEurSchema,
  printPriceEur: priceEurSchema,
});

export const deletePhotoSchema = z.object({
  photoId: z.uuid(),
});

export const uploadPhotoFieldsSchema = z.object({
  eventId: z.uuid({ error: "Elige un evento." }),
  priceCents: z.coerce.number().int().min(0).max(1_000_000),
  printPriceCents: z.coerce.number().int().min(0).max(1_000_000),
});

export const uploadFileSchema = z.object({
  type: z.enum(PHOTO_UPLOAD.acceptedTypes, {
    error: "Solo se aceptan JPG, PNG o WebP.",
  }),
  size: z
    .number()
    .positive({ error: "El archivo está vacío." })
    .max(PHOTO_UPLOAD.maxBytes, {
      error: `Cada archivo debe pesar menos de ${Math.round(PHOTO_UPLOAD.maxBytes / 1024 / 1024)} MB.`,
    }),
  name: z.string().trim().min(1).max(255),
});

export const tagPhotoSchema = z.object({
  photoId: z.uuid(),
  email: emailSchema,
});

export const removeTagSchema = z.object({
  tagId: z.uuid(),
});

const photoIdsSchema = z
  .array(z.uuid())
  .min(1, { error: "Selecciona al menos una foto." })
  .max(BULK_LIMITS.maxPhotos, { error: `Máximo ${BULK_LIMITS.maxPhotos} fotos por acción.` })
  .transform((ids) => [...new Set(ids)]);

export const bulkTagPhotosSchema = z.object({
  photoIds: photoIdsSchema,
  emails: z.string().trim().min(3, { error: "Escribe al menos un correo." }).max(5000),
});

export const bulkPriceSchema = z.object({
  photoIds: photoIdsSchema,
  priceEur: priceEurSchema,
  printPriceEur: priceEurSchema,
});

export const markPrintsDeliveredSchema = z.object({
  orderId: z.uuid(),
});

export const bulkDeleteSchema = z.object({
  photoIds: photoIdsSchema,
});

export const updateUserPermissionsSchema = z.object({
  profileId: z.uuid(),
  roleLabel: z
    .string()
    .trim()
    .max(60, { error: "Máximo 60 caracteres." })
    .transform((value) => (value ? value : null)),
  freeView: checkboxSchema,
  freeDownload: checkboxSchema,
  isAdmin: checkboxSchema,
});

export const userSearchSchema = z.string().trim().max(120).optional();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;
export type UploadPhotoFields = z.infer<typeof uploadPhotoFieldsSchema>;
