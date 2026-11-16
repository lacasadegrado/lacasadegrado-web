import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/common/components/ui/badge";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants";
import { getPaymentAccounts } from "@/modules/checkout/lib/services/payment-account.service";
import { installmentAmounts } from "@/modules/forms/lib/utils/installments.util";

import { PlanPaymentForm } from "../components/plan-payment-form/plan-payment-form";
import { PlanPayMethods } from "../components/plan-pay-methods/plan-pay-methods";
import { PlanProgress } from "../components/plan-progress/plan-progress";
import { PLANS_PATHS } from "../lib/constants/plans.constants";
import { getPlanForEmail } from "../lib/services/customer-plan.service";

/** Methods a person can pay a package with by hand (Pago Móvil, transferencia). */
const MANUAL_METHODS = PAYMENT_METHODS.filter((method) => method.enabled && method.kind === "manual");

const PAYMENT_STATUS = {
  pending: { label: "En revisión", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
} as const;

/** `/dashboard/payments/<planId>`: one package, its payments and the form for the next one. */
export async function PlanDetailScreen({ planId }: { planId: string }) {
  if (!z.uuid().safeParse(planId).success) notFound();
  const user = await requireSessionUser(PLANS_PATHS.plan(planId));
  const plan = await getPlanForEmail(planId, user.email);
  if (!plan) notFound();

  const remainingCents = Math.max(0, plan.priceCents - plan.confirmedCents);
  const remainingParts = plan.installments - plan.reservedInstallments;
  const parts = installmentAmounts(plan.priceCents, plan.installments);
  const nextAmount = parts[plan.reservedInstallments] ?? null;
  const accounts = plan.status === "open" && remainingParts > 0 ? (await getPaymentAccounts()).accounts : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="space-y-2">
        <Link
          href={PLANS_PATHS.list}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Pagos
        </Link>
        <p className="text-sm text-muted-foreground">{plan.eventName}</p>
        <h1 className="text-2xl font-bold">{plan.packageName}</h1>
        <p className="text-muted-foreground">
          {formatEur(plan.priceCents)}
          {plan.installments > 1 ? ` en ${plan.installments} cuotas` : ""}
          {plan.personName ? ` · ${plan.personName}` : ""}
        </p>
      </div>

      <section aria-labelledby="plan-progress" className="space-y-4 rounded-lg border bg-card p-5">
        <h2 id="plan-progress" className="sr-only">
          Lo que llevas pagado
        </h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Confirmado</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatEur(plan.confirmedCents)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">En revisión</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatEur(plan.pendingCents)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Falta</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatEur(remainingCents)}</dd>
          </div>
        </dl>
        <PlanProgress
          priceCents={plan.priceCents}
          confirmedCents={plan.confirmedCents}
          pendingCents={plan.pendingCents}
        />
        {plan.installments > 1 ? (
          <ol className="flex flex-wrap gap-2 text-xs tabular-nums" aria-label="Cuotas">
            {parts.map((amount, index) => (
              <li
                key={index}
                className={`rounded-full border px-2.5 py-1 ${index < plan.reservedInstallments ? "border-primary text-foreground" : "text-muted-foreground"}`}
              >
                Cuota {index + 1}: {formatEur(amount)}
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {plan.payments.length > 0 ? (
        <section aria-labelledby="plan-payments" className="space-y-3">
          <h2 id="plan-payments" className="text-lg font-semibold">
            Tus pagos
          </h2>
          <ol className="divide-y rounded-lg border">
            {plan.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium tabular-nums">
                    {formatEur(payment.amountCents)}
                    {plan.installments > 1
                      ? ` · ${payment.installmentsCovered} cuota${payment.installmentsCovered === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDateTime(payment.submittedAt)}
                    {payment.reference ? ` · Ref. ${payment.reference}` : ""}
                    {payment.recorded ? " · Registrado por el equipo" : ""}
                  </p>
                  {payment.rejectionReason ? (
                    <p className="mt-1 text-destructive">Motivo: {payment.rejectionReason}</p>
                  ) : null}
                </div>
                <Badge variant={PAYMENT_STATUS[payment.status].variant}>{PAYMENT_STATUS[payment.status].label}</Badge>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {plan.status === "paid" ? (
        <section className="flex items-start gap-3 rounded-lg border border-primary p-5">
          <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-xl">Tu paquete está pagado</h2>
            <p className="text-muted-foreground">
              No tienes que hacer nada más. Las fotos del paquete aparecen sin marca de agua en{" "}
              <Link href="/dashboard" className="underline underline-offset-4">
                Mis fotos
              </Link>{" "}
              a medida que las etiquetamos.
            </p>
          </div>
        </section>
      ) : remainingParts <= 0 ? (
        <section className="rounded-lg border border-dashed p-5">
          <h2 className="text-xl">Tus pagos están en revisión</h2>
          <p className="mt-1 text-muted-foreground">
            Ya reportaste todas las cuotas. Te avisamos por correo cuando las confirmemos. Si rechazamos alguna, podrás
            reportarla de nuevo aquí.
          </p>
        </section>
      ) : (
        <>
          {accounts ? (
            <section aria-labelledby="plan-pay" className="space-y-4">
              <div>
                <h2 id="plan-pay" className="text-xl">
                  Cómo pagar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paga desde la app de tu banco, en bolívares a la tasa del día.
                  {nextAmount !== null
                    ? ` ${plan.installments > 1 ? "La próxima cuota es de" : "El monto es"} ${formatEur(nextAmount)}${plan.eurToVes ? ` (${formatVes(nextAmount, plan.eurToVes)} hoy)` : ""}.`
                    : ""}
                </p>
              </div>
              <PlanPayMethods
                methods={MANUAL_METHODS.map(({ id, label, description }) => ({ id, label, description }))}
                accounts={accounts}
              />
            </section>
          ) : null}
          <section aria-labelledby="plan-next" className="space-y-6">
            <div>
              <h2 id="plan-next" className="text-xl">
                Reportar un pago
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando hayas pagado, elige cuántas cuotas cubre y envíanos la referencia y el comprobante.
              </p>
            </div>
            <PlanPaymentForm
              planId={plan.id}
              fields={plan.fields}
              priceCents={plan.priceCents}
              installments={plan.installments}
              reserved={plan.reservedInstallments}
              eurToVes={plan.eurToVes}
            />
          </section>
        </>
      )}
    </div>
  );
}
