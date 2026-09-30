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

const wallClockParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * The same instant as a Date whose UTC fields read Caracas wall-clock
 * time. For spreadsheets, which store dates without a timezone.
 */
export function toCaracasWallClock(date: Date): Date {
  const parts = Object.fromEntries(wallClockParts.formatToParts(date).map((part) => [part.type, part.value]));
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  );
}
