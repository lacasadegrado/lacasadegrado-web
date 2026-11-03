import { CircleCheck } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";
import { Badge } from "@/common/components/ui/badge";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur } from "@/common/lib/utils/money.util";

import { PlanPaymentForm } from "../components/plan-payment-form/plan-payment-form";
import { FORMS_PATHS } from "../lib/constants/forms.constants";
import { getPublicPlan } from "../lib/services/package-plan.service";

const PAYMENT_STATUS = {
  pending: { label: "En revisión", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
} as const;

/**
 * `/abono/<token>`, no login: the plan's progress, its payments and the
 * form for the next abono. An unknown or replaced link says so and points
 * to the form, where a new one can be requested.
 */
export async function PlanScreen({ token }: { token: string }) {
  const plan = await getPublicPlan(token);

  return (
    <>
      <SiteHeader />
      <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {!plan ? (
          <div className="space-y-3 rounded-lg border border-dashed p-6">
            <h1 className="text-2xl">Este enlace ya no funciona</h1>
            <p className="text-muted-foreground">
              Puede que hayas pedido uno nuevo, que lo reemplaza. Busca el correo más reciente que te
              enviamos o pide otro en el formulario donde hiciste tu primer pago.
            </p>
          </div>
        ) : (
          <PlanContent plan={plan} token={token} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function PlanContent({ plan, token }: { plan: NonNullable<Awaited<ReturnType<typeof getPublicPlan>>>; token: string }) {
  const remainingCents = Math.max(0, plan.priceCents - plan.confirmedCents);
  const remainingParts = plan.installments - plan.reservedInstallments;
  const confirmedPercent = Math.min(100, (plan.confirmedCents / plan.priceCents) * 100);
  const pendingPercent = Math.min(100 - confirmedPercent, (plan.pendingCents / plan.priceCents) * 100);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-muted-foreground">{plan.eventName}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Tu plan de pagos</h1>
        <p className="mt-3 text-muted-foreground">
          {plan.packageName} · {formatEur(plan.priceCents)}
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
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Confirmado ${formatEur(plan.confirmedCents)} de ${formatEur(plan.priceCents)}`}
        >
          <span className="bg-primary" style={{ width: `${confirmedPercent}%` }} />
          <span className="bg-amber/60" style={{ width: `${pendingPercent}%` }} />
        </div>
      </section>

      {plan.payments.length > 0 ? (
        <section aria-labelledby="plan-payments" className="space-y-3">
          <h2 id="plan-payments" className="text-lg font-semibold">
            Tus pagos
          </h2>
          <ol className="divide-y rounded-lg border">
            {plan.payments.map((payment, index) => (
              <li key={index} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium tabular-nums">
                    {formatEur(payment.amountCents)}
                    {plan.installments > 1
                      ? ` · ${payment.installmentsCovered} cuota${payment.installmentsCovered === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="text-muted-foreground">{formatDateTime(payment.submittedAt)}</p>
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
            <p className="text-muted-foreground">No tienes que hacer nada más. ¡Gracias!</p>
          </div>
        </section>
      ) : remainingParts <= 0 ? (
        <section className="rounded-lg border border-dashed p-5">
          <h2 className="text-xl">Tus pagos están en revisión</h2>
          <p className="mt-1 text-muted-foreground">
            Ya reportaste todas las cuotas. Si rechazamos alguno, podrás reportarlo de nuevo aquí.
          </p>
        </section>
      ) : (
        <section aria-labelledby="plan-next" className="space-y-6">
          <div>
            <h2 id="plan-next" className="text-xl">
              Reportar un abono
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Primero paga con los datos que te dieron; luego reporta aquí la referencia y el comprobante.
            </p>
          </div>
          <PlanPaymentForm
            token={token}
            fields={plan.fields}
            priceCents={plan.priceCents}
            installments={plan.installments}
            reserved={plan.reservedInstallments}
            eurToVes={plan.eurToVes}
          />
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Este enlace es solo tuyo: no lo compartas. Formulario:{" "}
        <Link href={FORMS_PATHS.public(plan.formSlug)} className="underline underline-offset-4">
          {plan.formTitle}
        </Link>
      </p>
    </div>
  );
}
