"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSessionUser } from "@/modules/auth/lib/services/session.service";
import { getClientIp } from "@/modules/auth/lib/utils/auth.util";
import { FORM_LIMITS } from "@/modules/forms/lib/constants/forms.constants";

import { PLANS_PATHS } from "../constants/plans.constants";
import { preparePlanUploadSchema, submitPlanPaymentSchema } from "../schemas/plans.schema";
import { preparePlanUpload, submitPlanPayment } from "../services/customer-plan.service";
import type { PreparePlanUploadResult, SubmitPlanPaymentResult } from "../types/plans.types";

const SIGNED_OUT = "Tu sesión terminó. Vuelve a entrar para reportar el pago.";
const GONE = "No encontramos este paquete en tu cuenta.";
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
  planId: string;
  draftId: string;
  fieldId: string;
  name: string;
  type: string;
  size: number;
}): Promise<PreparePlanUploadResult> {
  const viewer = await getSessionUser();
  if (!viewer) return { ok: false, message: SIGNED_OUT };
  const parsed = preparePlanUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? `Archivo no válido (máximo ${FORM_LIMITS.maxFileMb} MB).` };
  }
  const result = await preparePlanUpload(parsed.data, viewer, { ip: getClientIp(await headers()), trusted: false });
  if (!result.ok) return { ok: false, message: UPLOAD_MESSAGES[result.reason] };
  return { ok: true, key: result.key, uploadUrl: result.uploadUrl };
}

export async function submitPlanPaymentAction(input: {
  planId: string;
  draftId: string;
  installments: number;
  answers: Record<string, unknown>;
}): Promise<SubmitPlanPaymentResult> {
  const viewer = await getSessionUser();
  if (!viewer) return { ok: false, message: SIGNED_OUT };
  const parsed = submitPlanPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No pudimos leer el pago. Recarga la página." };

  const result = await submitPlanPayment(parsed.data, viewer, { ip: getClientIp(await headers()), trusted: false });
  if (result.ok) {
    revalidatePath(PLANS_PATHS.list, "layout");
    return result;
  }
  switch (result.reason) {
    case "invalid":
      return { ok: false, message: result.message ?? "Revisa los campos marcados.", fieldErrors: result.fieldErrors };
    case "rate_limited":
      return { ok: false, message: "Recibimos varios pagos seguidos. Espera un rato e intenta de nuevo." };
    case "paid":
      return { ok: false, message: PAID };
    case "not_found":
      return { ok: false, message: GONE };
  }
}
