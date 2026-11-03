import { DASHBOARD, type DashboardRange } from "../constants/dashboard.constants";
import type { DashboardBucket } from "../types/dashboard.types";

/** Venezuela is UTC-4 all year (no daylight saving since 2016). */
const CARACAS_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant Caracas midnight of that calendar day happens. */
function caracasMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) + CARACAS_OFFSET_MS);
}

function caracasToday(now: Date): { year: number; month: number; day: number } {
  const local = new Date(now.getTime() - CARACAS_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate() };
}

/**
 * The range's bounds as instants (`from` inclusive, `to` exclusive; no
 * `from` = since the beginning) and the chart's bar size: per day for
 * short ranges, per week, then per month.
 */
export function dashboardRangeBounds(
  range: DashboardRange,
  now: Date = new Date(),
): { from: Date | null; to: Date; bucket: DashboardBucket } {
  const { year, month, day } = caracasToday(now);
  let from: Date | null;
  let to = now;
  switch (range) {
    case "7d":
      from = caracasMidnight(year, month, day - 6);
      break;
    case "30d":
      from = caracasMidnight(year, month, day - 29);
      break;
    case "90d":
      from = caracasMidnight(year, month, day - 89);
      break;
    case "month":
      from = caracasMidnight(year, month, 1);
      break;
    case "last_month":
      from = caracasMidnight(year, month - 1, 1);
      to = caracasMidnight(year, month, 1);
      break;
    case "year":
      from = caracasMidnight(year, 0, 1);
      break;
    case "all":
      from = null;
      break;
  }
  const days = from ? (to.getTime() - from.getTime()) / DAY_MS : Infinity;
  const bucket: DashboardBucket =
    days <= DASHBOARD.dailyMaxDays ? "day" : days <= DASHBOARD.weeklyMaxDays ? "week" : "month";
  return { from, to, bucket };
}

/** Every bucket key ("YYYY-MM-DD" of its first day) from `start` to `end`, so empty days show as zero. */
export function bucketKeys(start: string, end: string, bucket: DashboardBucket): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last && keys.length < 1000) {
    keys.push(cursor.toISOString().slice(0, 10));
    if (bucket === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (bucket === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "3 nov", "sem. 3 nov" or "nov 2026", for the chart's axis. */
export function bucketLabel(key: string, bucket: DashboardBucket): string {
  const [year, month, day] = key.split("-").map(Number);
  if (bucket === "month") return `${MONTHS[month - 1]} ${year}`;
  return `${bucket === "week" ? "sem. " : ""}${day} ${MONTHS[month - 1]}`;
}

/** "YYYY-MM-DD" of the Caracas day (or week start, or month start) an instant falls in. */
export function bucketKeyFor(date: Date, bucket: DashboardBucket): string {
  const local = new Date(date.getTime() - CARACAS_OFFSET_MS);
  if (bucket === "month") local.setUTCDate(1);
  if (bucket === "week") {
    // ISO weeks start on Monday, like Postgres date_trunc('week').
    const weekday = (local.getUTCDay() + 6) % 7;
    local.setUTCDate(local.getUTCDate() - weekday);
  }
  return local.toISOString().slice(0, 10);
}
