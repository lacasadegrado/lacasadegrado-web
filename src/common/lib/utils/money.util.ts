/**
 * Money is stored as integer EUR cents. These helpers are the only place
 * that turns cents into display strings, so formatting stays consistent.
 * Venezuelan Spanish separators: "1.234,50".
 */

const eurNumberFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Intl still prints the pre-2021 "Bs.S" symbol for VES; people write "Bs."
const vesNumberFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "€ 5,00" */
export function formatEur(cents: number): string {
  return `€ ${eurNumberFormatter.format(cents / 100)}`;
}

/** `rate` is EUR to VES. Rounded to the céntimo at display time only. */
export function formatVes(cents: number, rate: number): string {
  return `Bs. ${formatVesNumber(cents, rate)}`;
}

/** "8.137,36" without the currency mark, for pasting into bank apps. */
export function formatVesNumber(cents: number, rate: number): string {
  return vesNumberFormatter.format((cents / 100) * rate);
}

/** Parses an admin-entered EUR amount like "5" or "5,50" into cents. */
export function eurToCents(input: number): number {
  return Math.round(input * 100);
}

const rateFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "977,88 Bs/EUR" */
export function formatRate(eurToVes: number): string {
  return `${rateFormatter.format(eurToVes)} Bs/EUR`;
}

/** Cents times rate, rounded to céntimos, as a number for arithmetic. */
export function centsToVes(cents: number, eurToVes: number): number {
  return Math.round(cents * eurToVes) / 100;
}
