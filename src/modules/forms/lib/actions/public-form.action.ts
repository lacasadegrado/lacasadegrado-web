"use server";

import { headers } from "next/headers";

import { getAdminUser } from "@/modules/admin/lib/services/admin-access.service";
import { getClientIp } from "@/modules/auth/lib/utils/auth.util";

import { FORM_LIMITS } from "../constants/forms.constants";
import { prepareFormUploadSchema, rosterPrefillSchema, submitFormSchema } from "../schemas/public-form.schema";
import type { FormClient } from "../services/form-rate-limit.service";
import { getRosterPrefill, prepareFormUpload, submitPublicForm } from "../services/public-form.service";
import type { PrepareFormUploadResult, RosterPrefillResult, SubmitFormResult } from "../types/public-form.types";

/**
 * Public on purpose: these forms are filled without an account. Abuse is
 * bounded by the per-IP and per-email limits in the service.
 */

/** The caller's IP, and whether a signed-in admin is filling it in (no limits then). */
async function formClient(): Promise<FormClient> {
  const [requestHeaders, admin] = await Promise.all([headers(), getAdminUser()]);
  return { ip: getClientIp(requestHeaders), trusted: Boolean(admin) };
}

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

  const result = await prepareFormUpload(parsed.data, await formClient());
  if (!result.ok) return { ok: false, message: UPLOAD_MESSAGES[result.reason] };
  return { ok: true, key: result.key, uploadUrl: result.uploadUrl };
}

export async function submitFormAction(input: {
  slug: string;
  draftId: string;
  answers: Record<string, unknown>;
  installments?: number;
  rosterEntryId?: string | null;
  honeypot?: string;
}): Promise<SubmitFormResult> {
  const parsed = submitFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No pudimos leer el formulario. Recarga la página." };

  // A bot filled the hidden field: answer like a success, store nothing.
  if (parsed.data.honeypot) {
    return {
      ok: true,
      receipt: { kind: "general", packageName: null, priceCents: null, reference: null, email: null, plan: null },
    };
  }

  const result = await submitPublicForm(parsed.data, await formClient());
  if (result.ok) return result;

  switch (result.reason) {
    case "invalid":
      return { ok: false, message: "Revisa los campos marcados.", fieldErrors: result.fieldErrors };
    case "rate_limited":
      return {
        ok: false,
        message: "Llegaron muchas respuestas seguidas desde esta conexión. Espera unos minutos e intenta de nuevo.",
      };
    case "not_open":
      return { ok: false, message: "Este formulario ya no recibe respuestas." };
    case "not_found":
      return { ok: false, message: "Este formulario ya no existe." };
  }
}

/**
 * The data the list has for the person picked, as starting answers.
 * Public like the form: the admin chose to let people pick by name.
 */
export async function getRosterPrefillAction(input: { slug: string; entryId: string }): Promise<RosterPrefillResult> {
  const parsed = rosterPrefillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No encontramos ese nombre. Búscalo de nuevo." };
  const prefill = await getRosterPrefill(parsed.data.slug, parsed.data.entryId);
  if (!prefill) return { ok: false, message: "No encontramos ese nombre. Recarga la página y búscalo de nuevo." };
  return { ok: true, prefill };
}
