"use server";

import { headers } from "next/headers";

import { getClientIp } from "@/modules/auth/lib/utils/auth.util";

import { FORM_LIMITS } from "../constants/forms.constants";
import { preparePlanUploadSchema, resendPlanLinkSchema, submitPlanPaymentSchema } from "../schemas/public-form.schema";
import { preparePlanUpload, resendPlanLinks, submitPlanPayment } from "../services/package-plan.service";
import type { PrepareFormUploadResult, ResendPlanLinkResult, SubmitPlanPaymentResult } from "../types/public-form.types";

/**
 * Public on purpose, like the forms: the plan link is the credential.
 * Abuse is bounded by the same per-IP and per-email limits.
 */

const GONE = "Este enlace ya no funciona. Pide uno nuevo en el formulario.";
const PAID = "Este paquete ya está pagado.";

const UPLOAD_MESSAGES = {
  not_found: GONE,
  paid: PAID,
  bad_field: "Este campo no acepta archivos.",
  bad_type: "Ese tipo de archivo no está permitido aquí.",
  too_large: "El archivo pesa más de lo permitido.",
  rate_limited: "Subiste muchos archivos seguidos. Espera un rato e intenta de nuevo.",
} as const;

export async function preparePlanUploadAction(input: {
  token: string;
  draftId: string;
  fieldId: string;
  name: string;
  type: string;
  size: number;
}): Promise<PrepareFormUploadResult> {
  const parsed = preparePlanUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? `Archivo no válido (máximo ${FORM_LIMITS.maxFileMb} MB).`,
    };
  }
  const result = await preparePlanUpload(parsed.data, getClientIp(await headers()));
  if (!result.ok) return { ok: false, message: UPLOAD_MESSAGES[result.reason] };
  return { ok: true, key: result.key, uploadUrl: result.uploadUrl };
}

export async function submitPlanPaymentAction(input: {
  token: string;
  draftId: string;
  installments: number;
  answers: Record<string, unknown>;
}): Promise<SubmitPlanPaymentResult> {
  const parsed = submitPlanPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No pudimos leer el pago. Recarga la página." };

  const result = await submitPlanPayment(parsed.data, getClientIp(await headers()));
  if (result.ok) return result;
  switch (result.reason) {
    case "invalid":
      return { ok: false, message: result.message ?? "Revisa los campos marcados.", fieldErrors: result.fieldErrors };
    case "rate_limited":
      return { ok: false, message: "Recibimos varios pagos seguidos desde aquí. Espera un rato e intenta de nuevo." };
    case "paid":
      return { ok: false, message: PAID };
    case "not_found":
      return { ok: false, message: GONE };
  }
}

export async function resendPlanLinkAction(input: { slug: string; email: string }): Promise<ResendPlanLinkResult> {
  const parsed = resendPlanLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Escribe un correo válido." };
  const result = await resendPlanLinks(parsed.data, getClientIp(await headers()));
  if (result === "rate_limited") {
    return { ok: false, message: "Ya pediste varios enlaces. Revisa tu correo o intenta más tarde." };
  }
  return { ok: true };
}
