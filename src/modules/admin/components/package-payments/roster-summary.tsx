import { Badge } from "@/common/components/ui/badge";

import type { PackagePaymentRow } from "../../lib/types/package-payment.types";

type RosterSummaryProps = {
  roster: NonNullable<PackagePaymentRow["roster"]>;
  /** One short line for tables. */
  compact?: boolean;
};

/**
 * How an answer relates to the form's people list: picked their name and
 * confirmed, corrected or completed data; or said they are not on it.
 */
export function RosterSummary({ roster, compact = false }: RosterSummaryProps) {
  if (!roster.listed) {
    return (
      <Badge variant="outline" className={compact ? "text-[0.65rem]" : undefined}>
        No estaba en el listado
      </Badge>
    );
  }
  const parts = [
    roster.changed > 0
      ? `${roster.changed} corregido${roster.changed === 1 ? "" : "s"}`
      : null,
    roster.filled > 0 ? `${roster.filled} completado${roster.filled === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const summary = parts.length > 0 ? parts.join(" · ") : compact ? "Sin cambios" : "Confirmó sus datos sin cambios";

  if (compact) return <span className="block text-xs text-muted-foreground">Del listado · {summary}</span>;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="secondary">Del listado</Badge>
      <span className="text-muted-foreground">{summary}</span>
    </p>
  );
}
