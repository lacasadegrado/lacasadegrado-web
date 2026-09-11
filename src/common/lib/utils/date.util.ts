/** The audience is in Venezuela; never depend on the server's timezone. */
const TIME_ZONE = "America/Caracas";

const longDate = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateTime = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "2026-07-18" -> "18 de julio de 2026", without timezone drift. */
export function formatDateOnly(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return longDate.format(new Date(year, month - 1, day));
}

export function formatDateTime(date: Date): string {
  return shortDateTime.format(date);
}
