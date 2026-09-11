/**
 * Money is stored as integer USD cents. These helpers are the only place
 * that turns cents into display strings, so formatting stays consistent.
 * Venezuelan Spanish locale: "5,00 US$" style separators.
 */

const usdFormatter = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Intl still prints the pre-2021 "Bs.S" symbol for VES; people write "Bs."
const vesNumberFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(cents: number): string {
  return usdFormatter.format(cents / 100);
}

/** `rate` is USD to VES. Rounded to the céntimo at display time only. */
export function formatVes(cents: number, rate: number): string {
  return `Bs. ${formatVesNumber(cents, rate)}`;
}

/** "8.137,36" without the currency mark, for pasting into bank apps. */
export function formatVesNumber(cents: number, rate: number): string {
  return vesNumberFormatter.format((cents / 100) * rate);
}

/** Parses an admin-entered USD amount like "5" or "5,50" into cents. */
export function usdToCents(input: number): number {
  return Math.round(input * 100);
}

const rateFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "813,74 Bs/USD" */
export function formatRate(usdToVes: number): string {
  return `${rateFormatter.format(usdToVes)} Bs/USD`;
}

/** Cents times rate, rounded to céntimos, as a number for arithmetic. */
export function centsToVes(cents: number, usdToVes: number): number {
  return Math.round(cents * usdToVes) / 100;
}
