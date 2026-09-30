"use server";

import { headers } from "next/headers";

import { getClientIp } from "@/modules/auth/lib/utils/auth.util";

import { FORM_LIMITS } from "../constants/forms.constants";
import { prepareFormUploadSchema, submitFormSchema } from "../schemas/public-form.schema";
import { prepareFormUpload, submitPublicForm } from "../services/public-form.service";
import type { PrepareFormUploadResult, SubmitFormResult } from "../types/public-form.types";

/**
 * Public on purpose: these forms are filled without an account. Abuse is
 * bounded by the per-IP and per-email limits in the service.
 */

const UPLOAD_MESSAGES = {
  not_found: "Este formulario ya no existe.",
  not_open: "Este formulario ya no recibe respuestas.",
  bad_field: "Este campo no acepta archivos.",
  bad_type: "Ese tipo de archivo no está permitido aquí.",
  too_large: "El archivo pesa más de lo permitido.",
  rate_limited: "Subiste muchos archivos seguidos. Espera un rato e intenta de nuevo.",
} as const;

export async function prepareFormUploadAction(input: {
  slug: string;
  draftId: string;
  fieldId: string;
  name: string;
  type: string;
  size: number;
}): Promise<PrepareFormUploadResult> {
  const parsed = prepareFormUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? `Archivo no válido (máximo ${FORM_LIMITS.maxFileMb} MB).`,
    };
  }

  const result = await prepareFormUpload(parsed.data, getClientIp(await headers()));
  if (!result.ok) return { ok: false, message: UPLOAD_MESSAGES[result.reason] };
  return { ok: true, key: result.key, uploadUrl: result.uploadUrl };
}

export async function submitFormAction(input: {
  slug: string;
  draftId: string;
  answers: Record<string, unknown>;
  honeypot?: string;
}): Promise<SubmitFormResult> {
  const parsed = submitFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No pudimos leer el formulario. Recarga la página." };

  // A bot filled the hidden field: answer like a success, store nothing.
  if (parsed.data.honeypot) {
    return { ok: true, packageName: "", priceCents: 0, reference: "", email: "" };
  }

  const result = await submitPublicForm(parsed.data, getClientIp(await headers()));
  if (result.ok) return result;

  switch (result.reason) {
    case "invalid":
      return { ok: false, message: "Revisa los campos marcados.", fieldErrors: result.fieldErrors };
    case "rate_limited":
      return {
        ok: false,
        message: "Recibimos varias respuestas seguidas desde aquí. Espera un rato e intenta de nuevo.",
      };
    case "not_open":
      return { ok: false, message: "Este formulario ya no recibe respuestas." };
    case "not_found":
      return { ok: false, message: "Este formulario ya no existe." };
  }
}
