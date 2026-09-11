import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { BUSINESS } from "@/common/lib/config/business.config";
import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { orders, payments } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { putObject } from "@/common/lib/storage/storage.service";
import { extensionForImageType } from "@/common/lib/utils/mime.util";
import { STORAGE_PREFIXES } from "@/modules/admin/lib/constants/admin.constants";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { SubmitPaymentInput } from "../schemas/checkout.schema";
import { buildPaymentSubmittedEmail } from "../utils/payment-email.util";

type ProofFile = { buffer: Buffer; contentType: string };

export type SubmitPaymentResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "not_found" | "wrong_status" };

/**
 * Records the customer's payment claim and moves the order to
 * `pending_verification`. No entitlement is granted here; that happens
 * only when an admin verifies (slice 6). Rejected orders may resubmit.
 */
export async function submitPayment(
  viewer: SessionUser,
  input: SubmitPaymentInput,
  proof: ProofFile | null,
): Promise<SubmitPaymentResult> {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      totalCents: orders.totalCents,
      exchangeRate: orders.exchangeRate,
    })
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.profileId, viewer.id)))
    .limit(1);

  if (!order) return { ok: false, reason: "not_found" };
  if (order.status !== "pending_payment" && order.status !== "rejected") {
    return { ok: false, reason: "wrong_status" };
  }

  let proofKey: string | null = null;
  if (proof) {
    proofKey = `${STORAGE_PREFIXES.proofs}/${order.id}/${randomUUID()}.${extensionForImageType(proof.contentType)}`;
    await putObject(proofKey, proof.buffer, proof.contentType);
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
    usdToVes: order.exchangeRate ? Number(order.exchangeRate) : null,
    reference: input.reference,
    paymentMethod: order.paymentMethod,
    slaHours: BUSINESS.verificationSlaHours,
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: viewer.email, ...email });
  if (!sent) console.error("[checkout] confirmation email not sent", { orderId: order.id });

  return { ok: true, orderId: order.id };
}
