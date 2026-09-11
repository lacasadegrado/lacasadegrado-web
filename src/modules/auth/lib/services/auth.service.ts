import "server-only";

import { createSupabaseServerClient } from "@/common/lib/supabase/supabase-server.util";

import { OTP_RATE_LIMITS, OTP_TTL_SECONDS } from "../constants/auth.constants";
import type { RequestOtpOutcome, VerifyOtpOutcome } from "../types/auth.types";
import {
  checkOtpRequestAllowed,
  countVerifyFailuresForCurrentCode,
  recordOtpAttempt,
} from "./otp-rate-limit.service";
import { upsertProfileForUser } from "./profile.service";

/**
 * Sends a 6-digit code. Our rate limits run first; the attempt is
 * recorded before Supabase is called so failed sends still count.
 */
export async function requestOtp(
  email: string,
  ip: string | null,
): Promise<RequestOtpOutcome> {
  const allowed = await checkOtpRequestAllowed(email, ip);
  if (!allowed.ok) {
    return {
      ok: false,
      code: allowed.reason,
      retryAfterSeconds: allowed.retryAfterSeconds,
    };
  }

  await recordOtpAttempt("request", email, ip);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (!error) return { ok: true };

  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        ok: false,
        code: "rate_limited",
        retryAfterSeconds: OTP_RATE_LIMITS.requestsPerEmail.windowSeconds,
      };
    case "email_address_invalid":
    case "email_address_not_authorized":
      return { ok: false, code: "invalid_email" };
    default:
      console.error("[auth] signInWithOtp failed", {
        code: error.code,
        status: error.status,
      });
      return { ok: false, code: "send_failed" };
  }
}

/**
 * Verifies a code and establishes the session cookie. On first success
 * the user's `profiles` row is created.
 */
export async function verifyOtp(
  email: string,
  token: string,
  ip: string | null,
): Promise<VerifyOtpOutcome> {
  const { failures, lastRequestAt } = await countVerifyFailuresForCurrentCode(email);
  if (failures >= OTP_RATE_LIMITS.verifyFailuresPerCode.max) {
    return { ok: false, code: "too_many_attempts" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.user?.email) {
    await recordOtpAttempt("verify_failed", email, ip);

    if (failures + 1 >= OTP_RATE_LIMITS.verifyFailuresPerCode.max) {
      return { ok: false, code: "too_many_attempts" };
    }

    // Supabase reports wrong and expired codes with the same error code.
    // We know when the last code was sent, so we can tell them apart.
    if (error?.code === "otp_expired") {
      const codeAgeMs = lastRequestAt ? Date.now() - lastRequestAt.getTime() : Infinity;
      const expired = codeAgeMs > OTP_TTL_SECONDS * 1000;
      return { ok: false, code: expired ? "code_expired" : "code_wrong" };
    }

    console.error("[auth] verifyOtp failed", {
      code: error?.code,
      status: error?.status,
    });
    return { ok: false, code: "verify_failed" };
  }

  const user = { id: data.user.id, email: data.user.email.toLowerCase() };
  await upsertProfileForUser(user);
  return { ok: true, user };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
