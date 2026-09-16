import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { entitlements, orderItems, orders, payments, profiles } from "@/common/lib/db/schema";

import type {
  PaymentReviewItem,
  ReviewResult,
  ReviewedPaymentItem,
} from "../types/payment-review.types";

/**
 * Orders waiting for a human to confirm the money arrived, oldest first,
 * each with its most recent payment submission. Proof keys never leave
 * the server: the card only learns whether a proof exists.
 */
export async function listPendingReviews(): Promise<PaymentReviewItem[]> {
  const orderRows = await db
    .select({
      orderId: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      customerEmail: profiles.email,
      customerName: profiles.fullName,
      method: orders.paymentMethod,
      totalCents: orders.totalCents,
      exchangeRate: orders.exchangeRate,
    })
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.profileId))
    .where(eq(orders.status, "pending_verification"))
    .orderBy(orders.createdAt);

  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((row) => row.orderId);

  const [paymentRows, itemCounts] = await Promise.all([
    db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        reference: payments.reference,
        payerName: payments.payerName,
        payerPhone: payments.payerPhone,
        payerBank: payments.payerBank,
        amountCents: payments.amountCents,
        submittedAt: payments.submittedAt,
        status: payments.status,
        proofKey: payments.proofKey,
      })
      .from(payments)
      .where(inArray(payments.orderId, orderIds))
      .orderBy(desc(payments.submittedAt)),
    db
      .select({
        orderId: orderItems.orderId,
        total: count(),
        prints: sql<number>`count(*) filter (where ${orderItems.format} = 'print')::int`,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .groupBy(orderItems.orderId),
  ]);

  const countByOrder = new Map(itemCounts.map((row) => [row.orderId, row]));
  const latestByOrder = new Map<string, (typeof paymentRows)[number]>();
  const rejectionsByOrder = new Map<string, number>();
  for (const payment of paymentRows) {
    if (!latestByOrder.has(payment.orderId)) latestByOrder.set(payment.orderId, payment);
    if (payment.status === "rejected") {
      rejectionsByOrder.set(payment.orderId, (rejectionsByOrder.get(payment.orderId) ?? 0) + 1);
    }
  }

  const items: PaymentReviewItem[] = [];
  for (const row of orderRows) {
    const latest = latestByOrder.get(row.orderId);
    if (!latest || latest.status !== "submitted") continue;
    items.push({
      orderId: row.orderId,
      status: row.status,
      createdAt: row.createdAt,
      customerEmail: row.customerEmail,
      customerName: row.customerName,
      method: row.method,
      totalCents: row.totalCents,
      eurToVes: row.exchangeRate ? Number(row.exchangeRate) : null,
      itemCount: countByOrder.get(row.orderId)?.total ?? 0,
      printCount: countByOrder.get(row.orderId)?.prints ?? 0,
      previousRejections: rejectionsByOrder.get(row.orderId) ?? 0,
      payment: {
        id: latest.id,
        reference: latest.reference,
        payerName: latest.payerName,
        payerPhone: latest.payerPhone,
        payerBank: latest.payerBank,
        amountCents: latest.amountCents,
        submittedAt: latest.submittedAt,
        hasProof: Boolean(latest.proofKey),
      },
    });
  }
  return items;
}

/** For the sidebar badge. */
export async function countPendingReviews(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(orders)
    .where(eq(orders.status, "pending_verification"));
  return row?.total ?? 0;
}

/** Last decisions, newest first, so an admin can double-check what they did. */
export async function listRecentReviews(limit = 10): Promise<ReviewedPaymentItem[]> {
  const rows = await db
    .select({
      orderId: orders.id,
      status: orders.status,
      customerEmail: profiles.email,
      totalCents: orders.totalCents,
      reference: payments.reference,
      decidedAt: payments.verifiedAt,
      rejectionReason: payments.rejectionReason,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(profiles, eq(profiles.id, orders.profileId))
    .where(inArray(payments.status, ["verified", "rejected"]))
    .orderBy(desc(payments.verifiedAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, decidedAt: row.decidedAt ?? new Date(0) }));
}

/** Proof key for an admin to view. Null when there is none. */
export async function getProofKey(paymentId: string): Promise<string | null> {
  const [row] = await db
    .select({ proofKey: payments.proofKey })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  return row?.proofKey ?? null;
}

type ApprovedOrder = {
  orderId: string;
  customerEmail: string;
  totalCents: number;
  entitlementsGranted: number;
  /** Lines bought as prints, for the confirmation email. */
  printCount: number;
};

/**
 * The only place entitlements are created. Runs in one transaction with a
 * row lock on the order so two admins cannot approve the same order twice.
 */
export async function approvePayment(
  adminId: string,
  orderId: string,
): Promise<ReviewResult & { order?: ApprovedOrder }> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        status: orders.status,
        profileId: orders.profileId,
        totalCents: orders.totalCents,
        customerEmail: profiles.email,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.profileId))
      .where(eq(orders.id, orderId))
      .for("update", { of: orders })
      .limit(1);

    if (!order) return { ok: false, reason: "not_found" };
    if (order.status !== "pending_verification") return { ok: false, reason: "wrong_status" };

    const [payment] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "submitted")))
      .orderBy(desc(payments.submittedAt))
      .limit(1);
    if (!payment) return { ok: false, reason: "wrong_status" };

    const now = new Date();
    await tx
      .update(payments)
      .set({ status: "verified", verifiedAt: now, verifiedBy: adminId })
      .where(eq(payments.id, payment.id));
    await tx
      .update(orders)
      .set({ status: "paid", paidAt: now })
      .where(eq(orders.id, order.id));

    const items = await tx
      .select({ photoId: orderItems.photoId, format: orderItems.format })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const printCount = items.filter((item) => item.format === "print").length;

    const granted = await tx
      .insert(entitlements)
      .values(
        items.map((item) => ({
          profileId: order.profileId,
          photoId: item.photoId,
          orderId: order.id,
        })),
      )
      .onConflictDoNothing({ target: [entitlements.profileId, entitlements.photoId] })
      .returning({ id: entitlements.id });

    return {
      ok: true,
      entitlementsGranted: granted.length,
      order: {
        orderId: order.id,
        customerEmail: order.customerEmail,
        totalCents: order.totalCents,
        entitlementsGranted: granted.length,
        printCount,
      },
    };
  });
}

type RejectedOrder = { orderId: string; customerEmail: string; reason: string };

export async function rejectPayment(
  adminId: string,
  orderId: string,
  reason: string,
): Promise<ReviewResult & { order?: RejectedOrder }> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status, customerEmail: profiles.email })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.profileId))
      .where(eq(orders.id, orderId))
      .for("update", { of: orders })
      .limit(1);

    if (!order) return { ok: false, reason: "not_found" };
    if (order.status !== "pending_verification") return { ok: false, reason: "wrong_status" };

    const [payment] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "submitted")))
      .orderBy(desc(payments.submittedAt))
      .limit(1);
    if (!payment) return { ok: false, reason: "wrong_status" };

    await tx
      .update(payments)
      .set({
        status: "rejected",
        rejectionReason: reason,
        verifiedAt: sql`now()`,
        verifiedBy: adminId,
      })
      .where(eq(payments.id, payment.id));
    await tx.update(orders).set({ status: "rejected" }).where(eq(orders.id, order.id));

    return {
      ok: true,
      order: { orderId: order.id, customerEmail: order.customerEmail, reason },
    };
  });
}
