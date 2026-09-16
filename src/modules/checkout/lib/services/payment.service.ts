import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { BUSINESS } from "@/common/lib/config/business.config";
import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { orders, payments } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { getPresignedPutUrl, headObject } from "@/common/lib/storage/storage.service";
import { extensionForImageType } from "@/common/lib/utils/mime.util";
import { STORAGE_PREFIXES } from "@/modules/admin/lib/constants/admin.constants";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import { PROOF_UPLOAD } from "../constants/checkout.constants";
import type { SubmitPaymentInput } from "../schemas/checkout.schema";
import { buildPaymentSubmittedEmail } from "../utils/payment-email.util";

export type SubmitPaymentResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "not_found" | "wrong_status" | "proof_invalid" };

/** The order, only if it belongs to the viewer and still accepts a payment report. */
async function getPayableOrder(viewer: SessionUser, orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      totalCents: orders.totalCents,
      exchangeRate: orders.exchangeRate,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.profileId, viewer.id)))
    .limit(1);
  if (!order) return { order: null, reason: "not_found" as const };
  if (order.status !== "pending_payment" && order.status !== "rejected") {
    return { order: null, reason: "wrong_status" as const };
  }
  return { order, reason: null };
}

/**
 * A presigned PUT for the proof screenshot. The browser uploads straight
 * to R2 (a server function never carries the file), then submits the
 * form with the key. The key is namespaced by order, so a later check can
 * tell the proof belongs to this order.
 */
export async function getProofUploadUrl(
  viewer: SessionUser,
  orderId: string,
  contentType: string,
): Promise<{ ok: true; key: string; uploadUrl: string } | { ok: false; reason: "not_found" | "wrong_status" }> {
  const { order, reason } = await getPayableOrder(viewer, orderId);
  if (!order) return { ok: false, reason };
  const key = `${STORAGE_PREFIXES.proofs}/${order.id}/${randomUUID()}.${extensionForImageType(contentType)}`;
  const uploadUrl = await getPresignedPutUrl(key, {
    contentType,
    expiresInSeconds: PROOF_UPLOAD.uploadUrlTtlSeconds,
  });
  return { ok: true, key, uploadUrl };
}

/** True when the object exists, sits under this order and respects the limits. */
async function isValidProof(orderId: string, key: string): Promise<boolean> {
  if (!key.startsWith(`${STORAGE_PREFIXES.proofs}/${orderId}/`)) return false;
  const info = await headObject(key);
  if (!info) return false;
  if (info.size > PROOF_UPLOAD.maxBytes) return false;
  return (PROOF_UPLOAD.acceptedTypes as readonly string[]).includes(info.contentType ?? "");
}

/**
 * Records the customer's payment claim and moves the order to
 * `pending_verification`. No entitlement is granted here; that happens
 * only when an admin verifies (slice 6). Rejected orders may resubmit.
 */
export async function submitPayment(
  viewer: SessionUser,
  input: SubmitPaymentInput,
): Promise<SubmitPaymentResult> {
  const { order, reason } = await getPayableOrder(viewer, input.orderId);
  if (!order) return { ok: false, reason };

  const proofKey = input.proofKey ?? null;
  if (proofKey && !(await isValidProof(order.id, proofKey))) {
    return { ok: false, reason: "proof_invalid" };
  }

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      orderId: order.id,
      method: order.paymentMethod,
      reference: input.reference,
      payerName: input.payerName,
      payerPhone: input.payerPhone,
      payerBank: input.payerBank,
      amountCents: order.totalCents,
      proofKey,
      status: "submitted",
    });
    await tx
      .update(orders)
      .set({ status: "pending_verification" })
      .where(eq(orders.id, order.id));
  });

  const email = buildPaymentSubmittedEmail({
    orderId: order.id,
    totalCents: order.totalCents,
    eurToVes: order.exchangeRate ? Number(order.exchangeRate) : null,
    reference: input.reference,
    paymentMethod: order.paymentMethod,
    slaHours: BUSINESS.verificationSlaHours,
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: viewer.email, ...email });
  if (!sent) console.error("[checkout] confirmation email not sent", { orderId: order.id });

  return { ok: true, orderId: order.id };
}
