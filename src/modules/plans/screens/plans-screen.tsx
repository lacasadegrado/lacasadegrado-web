import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/common/components/ui/badge";
import { formatEur } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { PlanProgress } from "../components/plan-progress/plan-progress";
import { PLANS_PATHS } from "../lib/constants/plans.constants";
import { listPlansForEmail } from "../lib/services/customer-plan.service";
import type { CustomerPlanSummary } from "../lib/types/plans.types";

/** What the person sees next to each package: the next step, in plain words. */
function planState(plan: CustomerPlanSummary): { label: string; variant: "default" | "secondary" | "outline" } {
  if (plan.status === "paid") return { label: "Pagado", variant: "default" };
  if (plan.reservedInstallments >= plan.installments) return { label: "En revisión", variant: "secondary" };
  return { label: "Por pagar", variant: "outline" };
}

/** `/dashboard/payments`: every package the person signed up for, with what is paid and what is left. */
export async function PlansScreen() {
  const user = await requireSessionUser(PLANS_PATHS.list);
  const plans = await listPlansForEmail(user.email);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pagos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus paquetes de fotos, lo que llevas pagado y lo que falta. Las fotos del paquete se liberan cuando esté
          pagado completo.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6">
          <h2 className="text-lg font-semibold">Todavía no tienes paquetes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando te inscribas en un paquete con el formulario que te compartieron, aparece aquí con{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => {
            const state = planState(plan);
            const remainingCents = Math.max(0, plan.priceCents - plan.confirmedCents);
            return (
              <li key={plan.id}>
                <Link
                  href={PLANS_PATHS.plan(plan.id)}
                  className="group block space-y-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-amber"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{plan.eventName}</p>
                      <p className="font-semibold">
                        {plan.packageName}
                        {plan.personName ? (
                          <span className="font-normal text-muted-foreground"> · {plan.personName}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={state.variant}>{state.label}</Badge>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground group-hover:text-foreground"
                      />
                    </div>
                  </div>
                  <PlanProgress
                    priceCents={plan.priceCents}
                    confirmedCents={plan.confirmedCents}
                    pendingCents={plan.pendingCents}
                  />
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatEur(plan.confirmedCents)} de {formatEur(plan.priceCents)} confirmado
                    {plan.status === "open" && remainingCents > 0 ? ` · faltan ${formatEur(remainingCents)}` : ""}
                    {plan.installments > 1 ? ` · ${plan.installments} cuotas` : ""}
                  </p>
                  {plan.status === "open" && plan.hasRejected && plan.reservedInstallments < plan.installments ? (
                    <p className="text-sm font-medium text-destructive">
                      Un pago fue rechazado: revisa el motivo y repórtalo de nuevo.
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
