/**
 * The price split into `installments` parts of whole cents; the last part
 * takes the leftover cents, so the parts always add up to the price
 * (€100 in 3 = 33,33 + 33,33 + 33,34).
 */
export function installmentAmounts(priceCents: number, installments: number): number[] {
  const parts = Math.max(1, installments);
  const base = Math.floor(priceCents / parts);
  return Array.from({ length: parts }, (_, index) => (index === parts - 1 ? priceCents - base * (parts - 1) : base));
}

/**
 * What `count` parts cost when `from` parts are already paid or under
 * review. Paying every remaining part is exactly the remaining balance.
 */
export function amountForInstallments(priceCents: number, installments: number, from: number, count: number): number {
  return installmentAmounts(priceCents, installments)
    .slice(from, from + count)
    .reduce((sum, part) => sum + part, 0);
}
