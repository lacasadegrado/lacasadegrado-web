import { formatEur } from "@/common/lib/utils/money.util";

import type { CustomerPlan } from "../../lib/types/plans.types";
import { PackageDetailsSheet } from "../package-details-sheet/package-details-sheet";
import { PlanProgress } from "../plan-progress/plan-progress";

/** The package at a glance: name, "Ver qué incluye" and how much is paid. Top of every "Pagar" step. */
export function PlanSummaryCard({ plan }: { plan: CustomerPlan }) {
  return (
    <section aria-label="Tu paquete" className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/50 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold">{plan.packageName}</p>
          <p className="text-xs text-muted-foreground">
            {plan.eventName}
            {plan.personName ? ` · ${plan.personName}` : ""}
          </p>
        </div>
        {plan.packageDescription ? (
          <PackageDetailsSheet packageName={plan.packageName} description={plan.packageDescription} />
        ) : null}
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">Monto pagado</span>
          <span className="font-semibold tabular-nums">
            {formatEur(plan.confirmedCents)} de {formatEur(plan.priceCents)}
          </span>
        </div>
        <PlanProgress priceCents={plan.priceCents} paidCents={plan.confirmedCents} />
      </div>
    </section>
  );
}
