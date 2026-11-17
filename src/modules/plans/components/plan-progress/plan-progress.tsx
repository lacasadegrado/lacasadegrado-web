import { formatEur } from "@/common/lib/utils/money.util";

/** How much of the package is paid (confirmed money only), as a bar. */
export function PlanProgress({
  priceCents,
  paidCents,
  className,
}: {
  priceCents: number;
  paidCents: number;
  className?: string;
}) {
  const percent = priceCents > 0 ? Math.min(100, (paidCents / priceCents) * 100) : 100;
  return (
    <div
      className={`h-2.5 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
      role="img"
      aria-label={`Pagado ${formatEur(paidCents)} de ${formatEur(priceCents)}`}
    >
      <span className="block h-full bg-amber" style={{ width: `${percent}%` }} />
    </div>
  );
}
