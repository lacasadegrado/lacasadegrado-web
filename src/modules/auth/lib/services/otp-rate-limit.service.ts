import "server-only";

import { and, count, desc, eq, gt, lt, min } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { otpAttempts, type OtpAttemptKind } from "@/common/lib/db/schema";

import {
  OTP_ATTEMPT_RETENTION_SECONDS,
  OTP_RATE_LIMITS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../constants/auth.constants";

type RequestCheck =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "rate_limited"; retryAfterSeconds: number };

function secondsAgo(seconds: number, now = Date.now()): Date {
  return new Date(now - seconds * 1000);
}

async function getLastRequestAt(email: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: otpAttempts.createdAt })
    .from(otpAttempts)
    .where(and(eq(otpAttempts.kind, "request"), eq(otpAttempts.email, email)))
    .orderBy(desc(otpAttempts.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

/**
 * Returns how many seconds until the oldest attempt in the window falls
 * out of it, i.e. when the caller may try again.
 */
async function checkWindow(
  column: typeof otpAttempts.email | typeof otpAttempts.ip,
  value: string,
  limit: { max: number; windowSeconds: number },
  now: number,
): Promise<number | null> {
  const since = secondsAgo(limit.windowSeconds, now);
  const [row] = await db
    .select({ total: count(), oldest: min(otpAttempts.createdAt) })
    .from(otpAttempts)
    .where(
      and(
        eq(otpAttempts.kind, "request"),
        eq(column, value),
        gt(otpAttempts.createdAt, since),
      ),
    );
  if (!row || row.total < limit.max || !row.oldest) return null;
  const oldestMs = new Date(row.oldest).getTime();
  return Math.max(1, Math.ceil((oldestMs + limit.windowSeconds * 1000 - now) / 1000));
}

export async function checkOtpRequestAllowed(
  email: string,
  ip: string | null,
): Promise<RequestCheck> {
  const now = Date.now();

  const lastRequestAt = await getLastRequestAt(email);
  if (lastRequestAt) {
    const elapsed = (now - lastRequestAt.getTime()) / 1000;
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed),
      };
    }
  }

  const emailRetry = await checkWindow(
    otpAttempts.email,
    email,
    OTP_RATE_LIMITS.requestsPerEmail,
    now,
  );
  if (emailRetry !== null) {
    return { ok: false, reason: "rate_limited", retryAfterSeconds: emailRetry };
  }

  if (ip) {
    const ipRetry = await checkWindow(
      otpAttempts.ip,
      ip,
      OTP_RATE_LIMITS.requestsPerIp,
      now,
    );
    if (ipRetry !== null) {
      return { ok: false, reason: "rate_limited", retryAfterSeconds: ipRetry };
    }
  }

  return { ok: true };
}

export async function recordOtpAttempt(
  kind: OtpAttemptKind,
  email: string,
  ip: string | null,
): Promise<void> {
  await db.insert(otpAttempts).values({ kind, email, ip });
  // Opportunistic prune; cheap thanks to the created_at index.
  await db
    .delete(otpAttempts)
    .where(lt(otpAttempts.createdAt, secondsAgo(OTP_ATTEMPT_RETENTION_SECONDS)));
}

/** Failed verifications since the most recent code was sent. */
export async function countVerifyFailuresForCurrentCode(
  email: string,
): Promise<{ failures: number; lastRequestAt: Date | null }> {
  const lastRequestAt = await getLastRequestAt(email);
  if (!lastRequestAt) return { failures: 0, lastRequestAt: null };

  const [row] = await db
    .select({ total: count() })
    .from(otpAttempts)
    .where(
      and(
        eq(otpAttempts.kind, "verify_failed"),
        eq(otpAttempts.email, email),
        gt(otpAttempts.createdAt, lastRequestAt),
      ),
    );
  return { failures: row?.total ?? 0, lastRequestAt };
}
