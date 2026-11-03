import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { BUSINESS } from "@/common/lib/config/business.config";
import { db } from "@/common/lib/db";
import type { OrderStatus, PaymentMethod } from "@/common/lib/db/schema";

import { DASHBOARD, type DashboardRange } from "../constants/dashboard.constants";
import type { DashboardData, EventLine, PersonLine, RevenuePoint } from "../types/dashboard.types";
import { bucketKeyFor, bucketKeys, bucketLabel, dashboardRangeBounds } from "../utils/dashboard-range.util";

/**
 * Every number of the admin dashboard, computed in SQL on the server.
 * Money that "entered" is only what an admin confirmed: photo orders
 * approved (by `paid_at`) and package payments confirmed (by
 * `reviewed_at`). Bolívares use each payment's own rate of that day.
 */

type Row = Record<string, unknown>;

async function rows<T extends Row>(query: SQL): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[];
}

const num = (value: unknown): number => Number(value ?? 0);

/**
 * Runs the queries a few at a time. With more queries in flight than pool
 * connections, postgres-js pipelines several on one connection, and
 * Supabase's transaction pooler can leave that connection hanging until
 * the statement timeout; so the dashboard never shares a connection.
 */
async function runLimited<T extends (() => Promise<unknown>)[]>(
  tasks: [...T],
  limit: number,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: unknown[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

export async function getDashboardData(range: DashboardRange, eventId?: string): Promise<DashboardData> {
  const { from, to, bucket } = dashboardRangeBounds(range);
  // Raw SQL has no column type to map a Date: send ISO strings and cast.
  const at = (date: Date) => sql`${date.toISOString()}::timestamptz`;
  const inRange = (column: SQL) =>
    from ? sql`(${column} >= ${at(from)} and ${column} < ${at(to)})` : sql`(${column} < ${at(to)})`;
  const photoEvent = eventId ? sql`and p.event_id = ${eventId}` : sql``;
  const formEvent = eventId ? sql`and f.event_id = ${eventId}` : sql``;
  const orderInEvent = eventId
    ? sql`and exists (select 1 from order_items oi join photos p on p.id = oi.photo_id where oi.order_id = o.id and p.event_id = ${eventId})`
    : sql``;
  const truncate = sql.raw(`'${bucket}'`);
  const zone = sql.raw(`'America/Caracas'`);
  const lateBefore = new Date(Date.now() - BUSINESS.print.deliveryDays * 24 * 60 * 60 * 1000);

  const [
    [photo],
    [packages],
    [plansPaid],
    [users],
    [pendingOrders],
    [pendingPackages],
    [prints],
    photoSeries,
    packageSeries,
    statusRows,
    methodRows,
    eventRows,
    rejectionRows,
    remindRows,
    [remindTotal],
    neverRows,
    [neverTotal],
    buyerRows,
  ] = await runLimited([
    () => rows(sql`
      select coalesce(sum(oi.unit_price_cents), 0)::int as eur,
        coalesce(sum(oi.unit_price_cents * coalesce(o.exchange_rate, 0)), 0)::float8 as ves,
        count(distinct o.id)::int as orders,
        count(*) filter (where oi.format = 'digital')::int as digital,
        count(*) filter (where oi.format = 'print')::int as print
      from order_items oi
      join orders o on o.id = oi.order_id
      join photos p on p.id = oi.photo_id
      where o.status = 'paid' and ${inRange(sql`o.paid_at`)} ${photoEvent}`),
    () => rows(sql`
      select coalesce(sum(coalesce(fs.amount_cents, fs.package_price_cents)), 0)::int as eur,
        coalesce(sum(coalesce(fs.amount_cents, fs.package_price_cents) * coalesce(fs.eur_to_ves, 0)), 0)::float8 as ves,
        count(*)::int as count
      from form_submissions fs
      join forms f on f.id = fs.form_id
      where fs.payment_status = 'confirmed' and ${inRange(sql`fs.reviewed_at`)} ${formEvent}`),
    () => rows(sql`
      select count(*)::int as count from package_plans pp
      where pp.status = 'paid' and ${inRange(sql`pp.paid_at`)} ${eventId ? sql`and pp.event_id = ${eventId}` : sql``}`),
    () => rows(sql`select count(*)::int as count from profiles where ${inRange(sql`created_at`)}`),
    () => rows(sql`
      select count(*)::int as count, coalesce(sum(o.total_cents), 0)::int as cents, min(o.created_at) as oldest
      from orders o where o.status = 'pending_verification' ${orderInEvent}`),
    () => rows(sql`
      select count(*)::int as count,
        coalesce(sum(coalesce(fs.amount_cents, fs.package_price_cents)), 0)::int as cents,
        min(fs.submitted_at) as oldest
      from form_submissions fs join forms f on f.id = fs.form_id
      where fs.payment_status = 'pending' ${formEvent}`),
    () => rows(sql`
      select count(*)::int as pending, count(*) filter (where o.paid_at < ${at(lateBefore)})::int as late
      from orders o where o.status = 'paid' and o.print_status = 'pending' ${orderInEvent}`),
    () => rows<{ bucket: string; cents: number }>(sql`
      select to_char(date_trunc(${truncate}, o.paid_at at time zone ${zone}), 'YYYY-MM-DD') as bucket,
        sum(oi.unit_price_cents)::int as cents
      from order_items oi join orders o on o.id = oi.order_id join photos p on p.id = oi.photo_id
      where o.status = 'paid' and ${inRange(sql`o.paid_at`)} ${photoEvent}
      group by 1`),
    () => rows<{ bucket: string; cents: number }>(sql`
      select to_char(date_trunc(${truncate}, fs.reviewed_at at time zone ${zone}), 'YYYY-MM-DD') as bucket,
        sum(coalesce(fs.amount_cents, fs.package_price_cents))::int as cents
      from form_submissions fs join forms f on f.id = fs.form_id
      where fs.payment_status = 'confirmed' and ${inRange(sql`fs.reviewed_at`)} ${formEvent}
      group by 1`),
    () => rows<{ status: OrderStatus; count: number; cents: number }>(sql`
      select o.status, count(*)::int as count, coalesce(sum(o.total_cents), 0)::int as cents
      from orders o where ${inRange(sql`o.created_at`)} ${orderInEvent}
      group by o.status`),
    () => rows<{ method: PaymentMethod; count: number; cents: number }>(sql`
      select o.payment_method as method, count(*)::int as count, coalesce(sum(o.total_cents), 0)::int as cents
      from orders o where o.status = 'paid' and ${inRange(sql`o.paid_at`)} ${orderInEvent}
      group by o.payment_method order by cents desc`),
    () => rows(sql`
      select e.id, e.name, e.is_active,
        (select count(*) from photos p where p.event_id = e.id)::int as photos,
        (select count(*) from photos p where p.event_id = e.id
          and exists (select 1 from photo_tags t where t.photo_id = p.id))::int as tagged_photos,
        (select count(distinct t.email) from photo_tags t join photos p on p.id = t.photo_id
          where p.event_id = e.id)::int as people_tagged,
        (select count(distinct o.profile_id) from orders o join order_items oi on oi.order_id = o.id
          join photos p on p.id = oi.photo_id where p.event_id = e.id and o.status = 'paid')::int as buyers,
        (select coalesce(sum(oi.unit_price_cents), 0) from orders o join order_items oi on oi.order_id = o.id
          join photos p on p.id = oi.photo_id
          where p.event_id = e.id and o.status = 'paid' and ${inRange(sql`o.paid_at`)})::int as revenue,
        (select count(*) from orders o join order_items oi on oi.order_id = o.id join photos p on p.id = oi.photo_id
          where p.event_id = e.id and o.status = 'paid' and ${inRange(sql`o.paid_at`)})::int as sold,
        (select count(*) from orders o join order_items oi on oi.order_id = o.id join photos p on p.id = oi.photo_id
          where p.event_id = e.id and o.status = 'paid' and oi.format = 'print' and ${inRange(sql`o.paid_at`)})::int as prints,
        (select coalesce(sum(coalesce(fs.amount_cents, fs.package_price_cents)), 0)
          from form_submissions fs join forms f on f.id = fs.form_id
          where f.event_id = e.id and fs.payment_status = 'confirmed' and ${inRange(sql`fs.reviewed_at`)})::int as packages
      from events e
      ${eventId ? sql`where e.id = ${eventId}` : sql``}
      order by e.event_date desc nulls first, e.created_at desc`),
    () => rows<{ reason: string; count: number }>(sql`
      select reason, count(*)::int as count from (
        select pa.rejection_reason as reason from payments pa
        where pa.status = 'rejected' and pa.rejection_reason is not null and ${inRange(sql`pa.verified_at`)}
        union all
        select fs.rejection_reason from form_submissions fs
        where fs.payment_status = 'rejected' and fs.rejection_reason is not null and ${inRange(sql`fs.reviewed_at`)}
      ) r group by reason order by count desc limit 5`),
    () => rows(sql`
      with tagged as (
        select t.email, count(distinct t.photo_id)::int as photos from photo_tags t
        join photos p on p.id = t.photo_id where true ${photoEvent} group by t.email
      )
      select tg.email, pr.full_name as name, pr.id as profile_id, tg.photos as value
      from tagged tg left join profiles pr on pr.email = tg.email
      where (pr.id is null or (not pr.free_view and not pr.free_download and not pr.is_admin
        and not exists (select 1 from entitlements en where en.profile_id = pr.id)))
      order by tg.photos desc, tg.email limit ${DASHBOARD.listLimit}`),
    () => rows(sql`
      with tagged as (
        select distinct t.email from photo_tags t join photos p on p.id = t.photo_id where true ${photoEvent}
      )
      select count(*)::int as count from tagged tg left join profiles pr on pr.email = tg.email
      where (pr.id is null or (not pr.free_view and not pr.free_download and not pr.is_admin
        and not exists (select 1 from entitlements en where en.profile_id = pr.id)))`),
    () => rows(sql`
      select pr.email, pr.full_name as name, pr.id as profile_id, count(*)::int as value
      from entitlements en join profiles pr on pr.id = en.profile_id join photos p on p.id = en.photo_id
      where not exists (select 1 from download_logs dl where dl.profile_id = pr.id) ${photoEvent}
      group by pr.id order by value desc limit ${DASHBOARD.listLimit}`),
    () => rows(sql`
      select count(distinct en.profile_id)::int as count
      from entitlements en join photos p on p.id = en.photo_id
      where not exists (select 1 from download_logs dl where dl.profile_id = en.profile_id) ${photoEvent}`),
    () => rows(sql`
      select pr.email, pr.full_name as name, pr.id as profile_id, sum(oi.unit_price_cents)::int as value
      from orders o join order_items oi on oi.order_id = o.id join photos p on p.id = oi.photo_id
      join profiles pr on pr.id = o.profile_id
      where o.status = 'paid' and ${inRange(sql`o.paid_at`)} ${photoEvent}
      group by pr.id order by value desc limit 5`),
  ], DASHBOARD.queryConcurrency);

  const photoRevenue = { eur: num(photo.eur), ves: Math.round(num(photo.ves)) };
  const packageRevenue = { eur: num(packages.eur), ves: Math.round(num(packages.ves)) };

  // Fill empty buckets so the chart shows the whole range.
  const byBucket = new Map<string, RevenuePoint>();
  const seriesKeys = [...photoSeries, ...packageSeries].map((point) => point.bucket).sort();
  const start = from ? bucketKeyFor(from, bucket) : seriesKeys[0];
  const end = bucketKeyFor(new Date(to.getTime() - 1), bucket);
  for (const key of start ? bucketKeys(start, end, bucket) : []) {
    byBucket.set(key, { bucket: key, label: bucketLabel(key, bucket), photos: 0, packages: 0 });
  }
  for (const point of photoSeries) {
    const entry = byBucket.get(point.bucket);
    if (entry) entry.photos = num(point.cents) / 100;
  }
  for (const point of packageSeries) {
    const entry = byBucket.get(point.bucket);
    if (entry) entry.packages = num(point.cents) / 100;
  }

  const person = (row: Row): PersonLine => ({
    email: String(row.email),
    name: (row.name as string | null) ?? null,
    profileId: (row.profile_id as string | null) ?? null,
    value: num(row.value),
  });

  return {
    range: { from, to, bucket },
    kpis: {
      revenue: { eur: photoRevenue.eur + packageRevenue.eur, ves: photoRevenue.ves + packageRevenue.ves },
      photoRevenue,
      packageRevenue,
      ordersPaid: num(photo.orders),
      averageOrderCents: num(photo.orders) > 0 ? Math.round(photoRevenue.eur / num(photo.orders)) : null,
      photosSold: { digital: num(photo.digital), print: num(photo.print) },
      packagePaymentsConfirmed: num(packages.count),
      packagesFullyPaid: num(plansPaid.count),
      newUsers: num(users.count),
    },
    pending: {
      orders: {
        count: num(pendingOrders.count),
        cents: num(pendingOrders.cents),
        oldestAt: pendingOrders.oldest ? new Date(pendingOrders.oldest as string) : null,
      },
      packagePayments: {
        count: num(pendingPackages.count),
        cents: num(pendingPackages.cents),
        oldestAt: pendingPackages.oldest ? new Date(pendingPackages.oldest as string) : null,
      },
      prints: { pending: num(prints.pending), late: num(prints.late) },
    },
    revenueSeries: [...byBucket.values()],
    ordersByStatus: statusRows.map((row) => ({ status: row.status, count: num(row.count), cents: num(row.cents) })),
    methods: methodRows.map((row) => ({ method: row.method, count: num(row.count), cents: num(row.cents) })),
    events: eventRows.map(
      (row): EventLine => ({
        id: String(row.id),
        name: String(row.name),
        isActive: Boolean(row.is_active),
        photos: num(row.photos),
        taggedPhotos: num(row.tagged_photos),
        peopleTagged: num(row.people_tagged),
        buyers: num(row.buyers),
        revenueCents: num(row.revenue),
        photosSold: num(row.sold),
        printsSold: num(row.prints),
        packagesConfirmedCents: num(row.packages),
      }),
    ),
    rejections: rejectionRows.map((row) => ({ reason: row.reason, count: num(row.count) })),
    toRemind: { total: num(remindTotal.count), people: remindRows.map(person) },
    neverDownloaded: { total: num(neverTotal.count), people: neverRows.map(person) },
    topBuyers: buyerRows.map(person),
  };
}
