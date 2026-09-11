import { z } from "zod";

export const approvePaymentSchema = z.object({
  orderId: z.uuid(),
});

export const rejectPaymentSchema = z.object({
  orderId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(5, { error: "Escribe un motivo claro; la persona lo verá." })
    .max(300, { error: "El motivo es demasiado largo." }),
});
