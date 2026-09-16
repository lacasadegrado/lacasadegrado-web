"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_MESSAGES, AUTH_PATHS } from "../constants/auth.constants";
import { requestOtpSchema, verifyOtpSchema } from "../schemas/auth.schema";
import { getHomePath } from "../services/access.service";
import { requestOtp, signOut, verifyOtp } from "../services/auth.service";
import type {
  RequestOtpErrorCode,
  RequestOtpState,
  VerifyOtpState,
} from "../types/auth.types";
import { getClientIp, sanitizeNextPath } from "../utils/auth.util";

function requestErrorMessage(
  code: RequestOtpErrorCode,
  retryAfterSeconds?: number,
): string {
  switch (code) {
    case "cooldown":
      return AUTH_MESSAGES.cooldown(retryAfterSeconds ?? 60);
    case "rate_limited":
      return AUTH_MESSAGES.rate_limited(
        Math.max(1, Math.ceil((retryAfterSeconds ?? 900) / 60)),
      );
    default:
      return AUTH_MESSAGES[code];
  }
}

export async function requestOtpAction(
  _previous: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const parsed = requestOtpSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      code: "invalid_email",
      message: AUTH_MESSAGES.invalid_email,
    };
  }

  const ip = getClientIp(await headers());
  const outcome = await requestOtp(parsed.data.email, ip);

  if (!outcome.ok) {
    return {
      status: "error",
      code: outcome.code,
      message: requestErrorMessage(outcome.code, outcome.retryAfterSeconds),
      retryAt: outcome.retryAfterSeconds
        ? Date.now() + outcome.retryAfterSeconds * 1000
        : undefined,
    };
  }

  return { status: "sent", email: parsed.data.email, sentAt: Date.now() };
}

export async function verifyOtpAction(
  _previous: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = verifyOtpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      code: "invalid_code",
      message: AUTH_MESSAGES.invalid_code,
    };
  }

  const ip = getClientIp(await headers());
  const outcome = await verifyOtp(parsed.data.email, parsed.data.token, ip);

  if (!outcome.ok) {
    return { status: "error", code: outcome.code, message: AUTH_MESSAGES[outcome.code] };
  }

  // An explicit ?next wins; otherwise admins land on the panel, customers on their photos.
  const explicitNext = sanitizeNextPath(parsed.data.next, "");
  redirect(explicitNext || (await getHomePath(outcome.user)));
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect(AUTH_PATHS.afterLogout);
}
