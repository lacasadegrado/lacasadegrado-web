/** Date ranges the dashboard offers, in the order the selector lists them. */
export const DASHBOARD_RANGES = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "month", label: "Este mes" },
  { value: "last_month", label: "Mes pasado" },
  { value: "year", label: "Este año" },
  { value: "all", label: "Desde el inicio" },
] as const;

export type DashboardRange = (typeof DASHBOARD_RANGES)[number]["value"];

export const DASHBOARD = {
  /** Lists of people (to remind, never downloaded, top buyers) show this many. */
  listLimit: 8,
  /** Queries in flight at once; well under the db pool so none share a connection. */
  queryConcurrency: 4,
  /** Up to this many days the revenue chart has one bar per day; then per week, then per month. */
  dailyMaxDays: 62,
  weeklyMaxDays: 200,
} as const;
