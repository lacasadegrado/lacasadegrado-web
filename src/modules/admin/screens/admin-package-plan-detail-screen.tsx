import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";

import { PackageReviewActions } from "../components/package-payments/package-review-actions";
import { PlanProgress } from "../components/package-payments/plan-progress";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { PACKAGE_PAYMENT_STATUS_BADGE, PACKAGE_PAYMENT_STATUS_LABELS } from "../lib/constants/sale.constants";
import { getPackagePlan } from "../lib/services/package-review.service";

/** Abonos › one plan: the balance and every payment, with confirm and reject on the pending ones. */
export async function AdminPackagePlanDetailScreen({ planId }: { planId: string }) {
  const plan = await getPackagePlan(planId);
  if (!plan) notFound();
  const who = plan.personName ?? plan.email ?? "Sin correo";
  const remainingCents = Math.max(0, plan.priceCents - plan.confirmedCents);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link
          href={ADMIN_PATHS.packagePlans}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Abonos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{who}</h1>
          {plan.status === "paid" ? <Badge>Pagado</Badge> : <Badge variant="outline">Con saldo pendiente</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {plan.personName && plan.email ? `${plan.email} · ` : ""}
          {plan.packageName} · {plan.eventName} · desde el {formatDateTime(plan.createdAt)}
        </p>
      </div>

      <section aria-labelledby="plan-balance" className="space-y-4 rounded-lg border p-4">
        <h2 id="plan-balance" className="sr-only">
          Saldo
        </h2>
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-muted-foreground">Precio</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(plan.priceCents)}</dd>
            {plan.installments > 1 ? <dd className="text-xs text-muted-foreground">en {plan.installments} cuotas</dd> : null}
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Confirmado</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(plan.confirmedCents)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Por revisar</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(plan.pendingCents)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Falta</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(remainingCents)}</dd>
          </div>
        </dl>
        <PlanProgress confirmedCents={plan.confirmedCents} pendingCents={plan.pendingCents} priceCents={plan.priceCents} />
        {plan.paidAt ? <p className="text-sm text-muted-foreground">Pagado completo el {formatDateTime(plan.paidAt)}.</p> : null}
      </section>

      <section aria-labelledby="plan-payments" className="space-y-3">
        <h2 id="plan-payments" className="text-lg font-semibold">
          Pagos
        </h2>
        <ol className="space-y-3">
          {plan.payments.map((payment, index) => (
            <li key={payment.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Pago {index + 1} ·{" "}
                  <span className="tabular-nums">
                    {formatEur(payment.amountCents)}
                    {payment.eurToVes ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatVes(payment.amountCents, payment.eurToVes)}
                      </span>
                    ) : null}
                  </span>
                </p>
                <Badge variant={PACKAGE_PAYMENT_STATUS_BADGE[payment.status]}>
                  {PACKAGE_PAYMENT_STATUS_LABELS[payment.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(payment.submittedAt)}
                {plan.installments > 1
                  ? ` · ${payment.installmentsCovered} cuota${payment.installmentsCovered === 1 ? "" : "s"}`
                  : ""}
                {payment.reference ? ` · ref. ${payment.reference}` : ""}
                {payment.rejectionReason ? ` · Motivo: ${payment.rejectionReason}` : ""}
              </p>
              <div className="flex flex-wrap items-start justify-between gap-3">
                {payment.status === "pending" ? (
                  <PackageReviewActions
                    submissionId={payment.id}
                    who={who}
                    amountCents={payment.amountCents}
                    reference={payment.reference}
                    size="sm"
                  />
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  {payment.hasProof ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={ADMIN_PATHS.packagePaymentFileApi(payment.id, "proof", 0)} target="_blank" rel="noreferrer">
                        Comprobante
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href={ADMIN_PATHS.packagePayment(payment.id)}>Detalle</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
