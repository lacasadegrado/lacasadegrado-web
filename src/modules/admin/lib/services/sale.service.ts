import "server-only";

import { and, asc, count, desc, eq, exists, ilike, inArray, max, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/common/lib/db";
import { downloadLogs, events, orderItems, orders, payments, photos, profiles } from "@/common/lib/db/schema";

import type { SalesSearchParams } from "../schemas/sale.schema";
import type { SaleDetail, SaleRow, SalesTotals } from "../types/sale.types";
import { likePattern } from "../utils/package-payment.util";

export const SALES_PAGE_SIZE = 25;

function whereFor(params: SalesSearchParams): SQL | undefined {
  const conditions: SQL[] = [];
  if (params.status !== "all") conditions.push(eq(orders.status, params.status));
  if (params.event) {
    const eventId = params.event;
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(orderItems)
          .innerJoin(photos, eq(photos.id, orderItems.photoId))
          .where(and(eq(orderItems.orderId, orders.id), eq(photos.eventId, eventId))),
      ),
    );
  }
  if (params.q) {
    const pattern = likePattern(params.q);
    conditions.push(sql`(${ilike(profiles.email, pattern)} or ${ilike(profiles.fullName, pattern)})`);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Orders for Ventas, newest first, with their photo counts and events.
 * Approved ones by default; the totals cover the whole filter, not the page.
 */
export async function listSales(
  params: SalesSearchParams,
): Promise<{ rows: SaleRow[]; total: number; totals: SalesTotals }> {
  const where = whereFor(params);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        orderId: orders.id,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        status: orders.status,
        buyerEmail: profiles.email,
        buyerName: profiles.fullName,
        method: orders.paymentMethod,
        totalCents: orders.totalCents,
        exchangeRate: orders.exchangeRate,
        itemCount: sql<number>`(select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int`,
        printCount: sql<number>`(select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id} and ${orderItems.format} = 'print')::int`,
        eventNames: sql<string[] | null>`(
          select array_agg(distinct ${events.name} order by ${events.name})
          from ${orderItems}
          join ${photos} on ${photos.id} = ${orderItems.photoId}
          join ${events} on ${events.id} = ${photos.eventId}
          where ${orderItems.orderId} = ${orders.id}
        )`,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.profileId))
      .where(where)
      .orderBy(sql`coalesce(${orders.paidAt}, ${orders.createdAt}) desc`)
      .limit(SALES_PAGE_SIZE)
      .offset((params.page - 1) * SALES_PAGE_SIZE),
    db
      .select({
        count: count(),
        totalCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        photos: sql<number>`coalesce(sum((select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id})), 0)::int`,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.profileId))
      .where(where),
  ]);

  return {
    rows: rows.map(({ exchangeRate, eventNames, ...row }) => ({
      ...row,
      eurToVes: exchangeRate ? Number(exchangeRate) : null,
      eventNames: eventNames ?? [],
    })),
    total: totals?.count ?? 0,
    totals: { count: totals?.count ?? 0, totalCents: totals?.totalCents ?? 0, photos: totals?.photos ?? 0 },
  };
}

/**
 * One order with the photos bought (format and price as charged), how
 * often each was downloaded, and every payment report. Proof keys stay on
 * the server: the page only learns whether a proof exists.
 */
export async function getSale(orderId: string): Promise<SaleDetail | null> {
  const [order] = await db
    .select({
      orderId: orders.id,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      status: orders.status,
      buyerId: profiles.id,
      buyerEmail: profiles.email,
      buyerName: profiles.fullName,
      method: orders.paymentMethod,
      totalCents: orders.totalCents,
      exchangeRate: orders.exchangeRate,
      printStatus: orders.printStatus,
      printDeliveredAt: orders.printDeliveredAt,
      termsVersion: orders.termsVersion,
    })
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.profileId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return null;

  const verifier = alias(profiles, "verifier");
  const [items, paymentRows] = await Promise.all([
    db
      .select({
        photoId: photos.id,
        filename: photos.originalFilename,
        width: photos.width,
        height: photos.height,
        eventName: events.name,
        format: orderItems.format,
        unitPriceCents: orderItems.unitPriceCents,
      })
      .from(orderItems)
      .innerJoin(photos, eq(photos.id, orderItems.photoId))
      .innerJoin(events, eq(events.id, photos.eventId))
      .where(eq(orderItems.orderId, order.orderId))
      .orderBy(asc(events.name), asc(photos.originalFilename)),
    db
      .select({
        id: payments.id,
        reference: payments.reference,
        payerName: payments.payerName,
        payerPhone: payments.payerPhone,
        payerBank: payments.payerBank,
        amountCents: payments.amountCents,
        status: payments.status,
        submittedAt: payments.submittedAt,
        verifiedAt: payments.verifiedAt,
        verifiedByEmail: verifier.email,
        rejectionReason: payments.rejectionReason,
        proofKey: payments.proofKey,
      })
      .from(payments)
      .leftJoin(verifier, eq(verifier.id, payments.verifiedBy))
      .where(eq(payments.orderId, order.orderId))
      .orderBy(desc(payments.submittedAt)),
  ]);

  const downloads =
    items.length === 0
      ? []
      : await db
          .select({ photoId: downloadLogs.photoId, total: count(), last: max(downloadLogs.downloadedAt) })
          .from(downloadLogs)
          .where(
            and(
              eq(downloadLogs.profileId, order.buyerId),
              inArray(
                downloadLogs.photoId,
                items.map((item) => item.photoId),
              ),
            ),
          )
          .groupBy(downloadLogs.photoId);
  const downloadsByPhoto = new Map(downloads.map((row) => [row.photoId, row]));

  const { exchangeRate, ...rest } = order;
  return {
    ...rest,
    eurToVes: exchangeRate ? Number(exchangeRate) : null,
    items: items.map((item) => ({
      ...item,
      downloads: downloadsByPhoto.get(item.photoId)?.total ?? 0,
      lastDownloadAt: downloadsByPhoto.get(item.photoId)?.last ?? null,
    })),
    payments: paymentRows.map(({ proofKey, ...payment }) => ({ ...payment, hasProof: Boolean(proofKey) })),
  };
}
