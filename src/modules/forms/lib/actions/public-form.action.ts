"use server";

import { headers } from "next/headers";

import { getAdminUser } from "@/modules/admin/lib/services/admin-access.service";
import { AUTH_MESSAGES } from "@/modules/auth/lib/constants/auth.constants";
import { requestOtp } from "@/modules/auth/lib/services/auth.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";
import { getClientIp } from "@/modules/auth/lib/utils/auth.util";

import { FORM_LIMITS } from "../constants/forms.constants";
import { prepareFormUploadSchema, rosterPrefillSchema, submitFormSchema } from "../schemas/public-form.schema";
import type { FormClient } from "../services/form-rate-limit.service";
import { getRosterPrefill, prepareFormUpload, submitPublicForm } from "../services/public-form.service";
import type {
  PrepareFormUploadResult,
  RosterPrefillResult,
  SignupContinuation,
  SubmitFormResult,
} from "../types/public-form.types";

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
  rosterEntryId?: string | null;
  honeypot?: string;
}): Promise<SubmitFormResult> {
  const parsed = submitFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No pudimos leer el formulario. Recarga la página." };

  // A bot filled the hidden field: answer like a success, store nothing.
  if (parsed.data.honeypot) {
    return {
      ok: true,
      receipt: { kind: "general", packageName: null, priceCents: null, reference: null, email: null, plan: null, signup: null },
      continuation: { status: "none" },
    };
  }

  const client = await formClient();
  const result = await submitPublicForm(parsed.data, client);
  if (result.ok) {
    const email = result.receipt.signup ? result.receipt.email : null;
    return { ok: true, receipt: result.receipt, continuation: email ? await continueSignup(email, client) : { status: "none" } };
  }

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
 * After a package sign-up: straight to "Pagos" when already signed in with
 * that email, otherwise a login code to that email. An admin filling it
 * for someone else gets neither; the person signs in on their own.
 */
async function continueSignup(email: string, client: FormClient): Promise<SignupContinuation> {
  const viewer = await getSessionUser();
  if (viewer?.email === email.toLowerCase()) return { status: "signed_in" };
  if (client.trusted) return { status: "none" };

  const outcome = await requestOtp(email, client.ip);
  // "cooldown": a code went out less than a minute ago; that one still works.
  if (outcome.ok || outcome.code === "cooldown") return { status: "code_sent", email, sentAt: Date.now() };
  return {
    status: "code_failed",
    email,
    message:
      outcome.code === "rate_limited"
        ? AUTH_MESSAGES.rate_limited(Math.max(1, Math.ceil((outcome.retryAfterSeconds ?? 900) / 60)))
        : "No pudimos enviarte el código ahora.",
  };
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
