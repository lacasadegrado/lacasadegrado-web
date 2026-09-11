import { z } from "zod";

const optionalOrderId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.uuid().optional(),
);

export const supportMessageSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe tu nombre." }).max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined)),
  message: z
    .string()
    .trim()
    .min(10, { error: "Cuéntanos un poco más, al menos 10 caracteres." })
    .max(2000, { error: "El mensaje es demasiado largo." }),
  orderId: optionalOrderId,
});

export const whatsappContactSchema = z.object({
  orderId: optionalOrderId,
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
