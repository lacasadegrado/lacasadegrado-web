import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, orderItems, orders, payments, photos } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import type { OrderDetail } from "../types/orders.types";

/** Null unless the order exists and belongs to the viewer. */
export async function getOrderForUser(
  viewer: SessionUser,
  orderId: string,
): Promise<OrderDetail | null> {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      subtotalCents: orders.subtotalCents,
      totalCents: orders.totalCents,
      exchangeRate: orders.exchangeRate,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      printStatus: orders.printStatus,
      printDeliveredAt: orders.printDeliveredAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.profileId, viewer.id)))
    .limit(1);
  if (!order) return null;

  const [items, paymentRows] = await Promise.all([
    db
      .select({
        photoId: orderItems.photoId,
        width: photos.width,
        height: photos.height,
        format: orderItems.format,
        unitPriceCents: orderItems.unitPriceCents,
        eventName: events.name,
      })
      .from(orderItems)
      .innerJoin(photos, eq(photos.id, orderItems.photoId))
      .innerJoin(events, eq(events.id, photos.eventId))
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(photos.createdAt)),
    db
      .select({
        id: payments.id,
        reference: payments.reference,
        payerName: payments.payerName,
        payerBank: payments.payerBank,
        status: payments.status,
        submittedAt: payments.submittedAt,
        verifiedAt: payments.verifiedAt,
        rejectionReason: payments.rejectionReason,
        proofKey: payments.proofKey,
      })
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.submittedAt)),
  ]);

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    eurToVes: order.exchangeRate ? Number(order.exchangeRate) : null,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    printStatus: order.printStatus,
    printDeliveredAt: order.printDeliveredAt,
    items,
    payments: paymentRows.map(({ proofKey, ...payment }) => ({
      ...payment,
      hasProof: Boolean(proofKey),
    })),
  };
}
