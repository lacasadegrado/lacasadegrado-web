import { formatEur } from "@/common/lib/utils/money.util";

/** Confirmed (teal) and under review (amber) over the package price. */
export function PlanProgress({
  confirmedCents,
  pendingCents,
  priceCents,
  className,
}: {
  confirmedCents: number;
  pendingCents: number;
  priceCents: number;
  className?: string;
}) {
  const confirmed = priceCents > 0 ? Math.min(100, (confirmedCents / priceCents) * 100) : 0;
  const pending = priceCents > 0 ? Math.min(100 - confirmed, (pendingCents / priceCents) * 100) : 0;
  return (
    <div
      className={`flex h-2 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
      role="img"
      aria-label={`Confirmado ${formatEur(confirmedCents)}, en revisión ${formatEur(pendingCents)}, de ${formatEur(priceCents)}`}
    >
      <span className="bg-primary" style={{ width: `${confirmed}%` }} />
      <span className="bg-amber/60" style={{ width: `${pending}%` }} />
    </div>
  );
}
