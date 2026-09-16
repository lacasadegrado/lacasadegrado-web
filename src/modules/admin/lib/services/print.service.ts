import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, orderItems, orders, photos, profiles } from "@/common/lib/db/schema";

import type { MarkDeliveredResult, PrintJob } from "../types/print.types";

const jobColumns = {
  orderId: orders.id,
  customerEmail: profiles.email,
  customerName: profiles.fullName,
  paidAt: orders.paidAt,
  printStatus: orders.printStatus,
  printDeliveredAt: orders.printDeliveredAt,
  printCount: sql<number>`count(*) filter (where ${orderItems.format} = 'print')::int`,
  // One order can span events; the first alphabetically labels the job.
  institution: sql<string>`min(${events.institution})`,
  eventName: sql<string>`min(${events.name})`,
};

function toJob(row: {
  orderId: string;
  customerEmail: string;
  customerName: string | null;
  paidAt: Date | null;
  printStatus: "pending" | "delivered" | null;
  printDeliveredAt: Date | null;
  printCount: number;
  institution: string;
  eventName: string;
}): PrintJob {
  return { ...row, printStatus: row.printStatus ?? "pending" };
}

/**
 * Paid orders that include prints. Pending ones first (oldest payment
 * first, so the longest wait is at the top), then the delivered ones.
 */
export async function listPrintJobs(): Promise<PrintJob[]> {
  const rows = await db
    .select(jobColumns)
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.profileId))
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(photos, eq(photos.id, orderItems.photoId))
    .innerJoin(events, eq(events.id, photos.eventId))
    .where(and(eq(orders.status, "paid"), sql`${orders.printStatus} is not null`))
    .groupBy(orders.id, profiles.email, profiles.fullName)
    .orderBy(
      sql`case when ${orders.printStatus} = 'pending' then 0 else 1 end`,
      asc(orders.paidAt),
      desc(orders.printDeliveredAt),
    );
  return rows.map(toJob);
}

/** For the sidebar badge. */
export async function countPendingPrints(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(orders)
    .where(and(eq(orders.status, "paid"), eq(orders.printStatus, "pending")));
  return row?.total ?? 0;
}

/**
 * Records the hand-off to the institution. Only a paid order with pending
 * prints can be marked, and only once; the timestamp starts the
 * responsibility window shown to the customer.
 */
export async function markPrintsDelivered(orderId: string): Promise<MarkDeliveredResult> {
  const updated = await db
    .update(orders)
    .set({ printStatus: "delivered", printDeliveredAt: new Date() })
    .where(
      and(eq(orders.id, orderId), eq(orders.status, "paid"), eq(orders.printStatus, "pending")),
    )
    .returning({ id: orders.id });
  if (updated.length === 0) {
    const [exists] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return { ok: false, reason: exists ? "wrong_status" : "not_found" };
  }

  const [row] = await db
    .select(jobColumns)
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.profileId))
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(photos, eq(photos.id, orderItems.photoId))
    .innerJoin(events, eq(events.id, photos.eventId))
    .where(eq(orders.id, orderId))
    .groupBy(orders.id, profiles.email, profiles.fullName)
    .limit(1);
  return { ok: true, job: toJob(row) };
}
