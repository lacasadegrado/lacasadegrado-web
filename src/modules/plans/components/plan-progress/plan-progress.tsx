import { formatEur } from "@/common/lib/utils/money.util";

/** Confirmed (teal) and under review (amber) over the package price. */
export function PlanProgress({
  priceCents,
  confirmedCents,
  pendingCents,
  className,
}: {
  priceCents: number;
  confirmedCents: number;
  pendingCents: number;
  className?: string;
}) {
  const confirmedPercent = priceCents > 0 ? Math.min(100, (confirmedCents / priceCents) * 100) : 100;
  const pendingPercent = priceCents > 0 ? Math.min(100 - confirmedPercent, (pendingCents / priceCents) * 100) : 0;
  return (
    <div
      className={`flex h-2.5 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
      role="img"
      aria-label={`Confirmado ${formatEur(confirmedCents)}, en revisión ${formatEur(pendingCents)}, de ${formatEur(priceCents)}`}
    >
      <span className="bg-primary" style={{ width: `${confirmedPercent}%` }} />
      <span className="bg-amber/60" style={{ width: `${pendingPercent}%` }} />
    </div>
  );
}
