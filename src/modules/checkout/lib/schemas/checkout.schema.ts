import { z } from "zod";

import { photoIdListSchema } from "@/modules/cart/lib/schemas/cart.schema";

import { ENABLED_PAYMENT_METHOD_IDS, PROOF_UPLOAD } from "../constants/checkout.constants";

export const createOrderSchema = z.object({
  photoIds: photoIdListSchema.pipe(z.array(z.uuid()).min(1)),
  paymentMethod: z.enum(ENABLED_PAYMENT_METHOD_IDS as [string, ...string[]]),
});

export const submitPaymentSchema = z.object({
  orderId: z.uuid(),
  reference: z
    .string()
    .trim()
    .min(4, { error: "Escribe el número de referencia completo." })
    .max(40, { error: "La referencia es demasiado larga." })
    .regex(/^[A-Za-z0-9-]+$/, { error: "Solo letras, números y guiones." }),
  payerName: z
    .string()
    .trim()
    .min(2, { error: "Escribe el nombre de quien pagó." })
    .max(80),
  payerPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, { error: "Escribe un teléfono válido, por ejemplo 0412-1234567." }),
  payerBank: z
    .string()
    .trim()
    .min(2, { error: "Escribe el banco desde el que pagaste." })
    .max(60),
});

export const proofFileSchema = z.object({
  type: z.enum(PROOF_UPLOAD.acceptedTypes, {
    error: "La captura debe ser JPG, PNG o WebP.",
  }),
  size: z
    .number()
    .positive()
    .max(PROOF_UPLOAD.maxBytes, {
      error: `La captura debe pesar menos de ${Math.round(PROOF_UPLOAD.maxBytes / 1024 / 1024)} MB.`,
    }),
});

export const manualRateSchema = z.object({
  usdToVes: z.coerce
    .number({ error: "Escribe la tasa en bolívares por dólar." })
    .positive({ error: "La tasa debe ser mayor que cero." })
    .max(1_000_000),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
