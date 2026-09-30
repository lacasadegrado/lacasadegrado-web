import "server-only";

import { and, count, eq, gt, lt, type SQL } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { formAttempts, type FormAttemptKind } from "@/common/lib/db/schema";

import { FORM_RATE_LIMITS } from "../constants/forms.constants";

function secondsAgo(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000);
}

async function countSince(kind: FormAttemptKind, windowSeconds: number, where: SQL): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(formAttempts)
    .where(and(eq(formAttempts.kind, kind), where, gt(formAttempts.createdAt, secondsAgo(windowSeconds))));
  return row?.total ?? 0;
}

/** Without an IP (local dev, odd proxies) the IP limits cannot apply. */
export async function isUploadAllowed(ip: string | null): Promise<boolean> {
  if (!ip) return true;
  const { max, windowSeconds } = FORM_RATE_LIMITS.uploadsPerIp;
  return (await countSince("upload", windowSeconds, eq(formAttempts.ip, ip))) < max;
}

export async function isSubmitAllowed(formId: string, email: string, ip: string | null): Promise<boolean> {
  const perEmail = FORM_RATE_LIMITS.submitsPerEmailPerForm;
  const byEmail = await countSince(
    "submit",
    perEmail.windowSeconds,
    and(eq(formAttempts.formId, formId), eq(formAttempts.email, email)) as SQL,
  );
  if (byEmail >= perEmail.max) return false;

  if (!ip) return true;
  const perIp = FORM_RATE_LIMITS.submitsPerIp;
  return (await countSince("submit", perIp.windowSeconds, eq(formAttempts.ip, ip))) < perIp.max;
}

export async function recordFormAttempt(input: {
  kind: FormAttemptKind;
  formId: string;
  ip: string | null;
  email?: string;
}): Promise<void> {
  await db.insert(formAttempts).values(input);
  // Opportunistic prune; cheap thanks to the created_at index.
  await db
    .delete(formAttempts)
    .where(lt(formAttempts.createdAt, secondsAgo(FORM_RATE_LIMITS.retentionSeconds)));
}
