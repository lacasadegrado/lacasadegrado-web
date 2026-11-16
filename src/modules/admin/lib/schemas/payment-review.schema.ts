import { z } from "zod";

import { PLAN_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import { PLAN_PAYMENT_METHOD_IDS } from "@/modules/plans/lib/constants/plans.constants";

export const approvePaymentSchema = z.object({
  orderId: z.uuid(),
});

export const confirmPackagePaymentSchema = z.object({
  submissionId: z.uuid(),
});

export const rejectPackagePaymentSchema = z.object({
  submissionId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(5, { error: "Escribe un motivo claro; la persona lo verá." })
    .max(300, { error: "El motivo es demasiado largo." }),
});

export const rejectPaymentSchema = z.object({
  orderId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(5, { error: "Escribe un motivo claro; la persona lo verá." })
    .max(300, { error: "El motivo es demasiado largo." }),
});

/** "Registrar pago": installments received outside the app, confirmed at once. */
export const recordPackagePaymentSchema = z.object({
  planId: z.uuid(),
  installments: z.coerce.number().int().min(1, { error: "Elige cuántas cuotas recibiste." }).max(PLAN_LIMITS.maxInstallments),
  method: z.enum(PLAN_PAYMENT_METHOD_IDS, { error: "Elige cómo te pagaron." }),
  reference: z
    .string()
    .trim()
    .max(60, { error: "Máximo 60 caracteres." })
    .transform((value) => value || null),
  note: z
    .string()
    .trim()
    .max(300, { error: "Máximo 300 caracteres." })
    .transform((value) => value || null),
});

export type RecordPackagePaymentInput = z.infer<typeof recordPackagePaymentSchema>;
