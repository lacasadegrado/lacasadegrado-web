import { formatEur, formatVes } from "@/common/lib/utils/money.util";

import type { PlanReceipt as PlanReceiptData } from "../../lib/types/public-form.types";

/** The payment just reported and the plan's balance, on the success screen in "Pagos". */
export function PlanReceipt({ plan }: { plan: PlanReceiptData }) {
  const remaining = Math.max(0, plan.priceCents - plan.confirmedCents - plan.pendingCents);
  const confirmedPercent = Math.min(100, (plan.confirmedCents / plan.priceCents) * 100);
  const pendingPercent = Math.min(100 - confirmedPercent, (plan.pendingCents / plan.priceCents) * 100);

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-1 rounded-md bg-muted p-4 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Este pago</dt>
        <dd className="font-medium tabular-nums">
          {formatEur(plan.amountCents)}
          {plan.eurToVes ? ` · ${formatVes(plan.amountCents, plan.eurToVes)}` : ""}
          {plan.installments > 1
            ? ` · ${plan.installmentsCovered} cuota${plan.installmentsCovered === 1 ? "" : "s"} de ${plan.installments}`
            : ""}
        </dd>
        <dt className="text-muted-foreground">En revisión</dt>
        <dd className="font-medium tabular-nums">{formatEur(plan.pendingCents)}</dd>
        <dt className="text-muted-foreground">Confirmado</dt>
        <dd className="font-medium tabular-nums">
          {formatEur(plan.confirmedCents)} de {formatEur(plan.priceCents)}
        </dd>
        {remaining > 0 ? (
          <>
            <dt className="text-muted-foreground">Falta por pagar</dt>
            <dd className="font-medium tabular-nums">{formatEur(remaining)}</dd>
          </>
        ) : null}
      </dl>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Confirmado ${formatEur(plan.confirmedCents)}, en revisión ${formatEur(plan.pendingCents)}, de ${formatEur(plan.priceCents)}`}
      >
        <span className="bg-primary" style={{ width: `${confirmedPercent}%` }} />
        <span className="bg-amber/60" style={{ width: `${pendingPercent}%` }} />
      </div>

    </div>
  );
}
