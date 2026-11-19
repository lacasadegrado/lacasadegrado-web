import { ArrowLeft, CircleCheck, Clock, ReceiptText, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { PackageDetailsSheet } from "../components/package-details-sheet/package-details-sheet";
import { PlanProgress } from "../components/plan-progress/plan-progress";
import { PLAN_PAYMENT_METHOD_LABELS, PLANS_PATHS } from "../lib/constants/plans.constants";
import { getPlanForEmail } from "../lib/services/customer-plan.service";
import { installmentLines, type InstallmentState } from "../lib/utils/plan-installments.util";

const PAYMENT_STATUS = {
  pending: { label: "Verificando", variant: "secondary" },
  confirmed: { label: "Aprobado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
} as const;

const INSTALLMENT_STATE: Record<InstallmentState, { label: string; className: string }> = {
  paid: { label: "Pagada", className: "text-foreground" },
  checking: { label: "Estamos verificando tu pago", className: "text-foreground" },
  due: { label: "Por pagar", className: "text-muted-foreground" },
};

function InstallmentIcon({ state }: { state: InstallmentState }) {
  if (state === "paid") return <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />;
  if (state === "checking") return <Clock aria-hidden="true" className="size-5 shrink-0 text-amber" />;
  return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />;
}

/**
 * `/dashboard/payments/<planId>`: one package in plain words. One big
 * "Pagar" button (the stepper), then what is paid, each installment and
 * the payments sent.
 */
export async function PlanDetailScreen({ planId, sent }: { planId: string; sent: boolean }) {
  if (!z.uuid().safeParse(planId).success) notFound();
  const user = await requireSessionUser(PLANS_PATHS.plan(planId));
  const plan = await getPlanForEmail(planId, user.email);
  if (!plan) notFound();

  const lines = installmentLines(plan);
  const remainingCents = Math.max(0, plan.priceCents - plan.confirmedCents);
  const canPay = plan.status === "open" && plan.reservedInstallments < plan.installments;
  const nextLine = lines.find((line) => line.state === "due") ?? null;
  const lastPayment = plan.payments.at(-1) ?? null;
  const rejected = canPay && lastPayment?.status === "rejected" ? lastPayment : null;

  return (
    <div className="mx-auto max-w-lg space-y-8">
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
        {plan.packageDescription ? (
          <PackageDetailsSheet packageName={plan.packageName} description={plan.packageDescription} />
        ) : null}
      </div>

      {sent ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-primary bg-primary/10 p-4">
          <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">¡Recibimos tu pago!</p>
            <p className="text-sm text-muted-foreground">
              Lo vamos a verificar y te avisamos por correo. No tienes que hacer nada más.
            </p>
          </div>
        </div>
      ) : null}

      {rejected ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive p-4">
          <TriangleAlert aria-hidden="true" className="size-6 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">No pudimos aprobar tu último pago</p>
            <p className="text-sm text-muted-foreground">
              {rejected.rejectionReason ? `Motivo: ${rejected.rejectionReason}. ` : ""}Toca «Pagar» para enviarlo de
              nuevo.
            </p>
          </div>
        </div>
      ) : null}

      {plan.status === "paid" ? (
        <div className="flex items-start gap-3 rounded-lg border border-primary p-5">
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
            <Button asChild size="lg" className="mt-4 h-12 w-full text-base sm:w-auto">
              <Link href={PLANS_PATHS.receipt(plan.id)}>
                <ReceiptText aria-hidden="true" />
                Ver mi recibo
              </Link>
            </Button>
          </div>
        </div>
      ) : canPay ? (
        <div className="space-y-2">
          {/* Right after sending a payment the main message is the confirmation, not another payment. */}
          <Button asChild size="lg" variant={sent ? "outline" : "default"} className="h-14 w-full text-lg">
            <Link href={PLANS_PATHS.pay(plan.id)}>
              {sent
                ? "Pagar otra cuota"
                : plan.installments > 1 && nextLine
                  ? `Pagar cuota ${nextLine.number}`
                  : "Pagar"}
            </Link>
          </Button>
          {nextLine ? (
            <p className="text-center text-sm text-muted-foreground">
              {plan.installments > 1
                ? `Tu próxima cuota es la ${nextLine.number} de ${plan.installments}: ${formatEur(nextLine.amountCents)}.`
                : `Monto a pagar: ${formatEur(nextLine.amountCents)}.`}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-5">
          <Clock aria-hidden="true" className="size-6 shrink-0 text-amber" />
          <div>
            <h2 className="text-lg font-semibold">Estamos verificando tus pagos</h2>
            <p className="text-sm text-muted-foreground">
              Ya enviaste todo. Te avisamos por correo cuando lo aprobemos. No tienes que hacer nada más.
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="plan-progress" className="space-y-4 rounded-lg border bg-card p-5">
        <div className="space-y-2">
          <h2 id="plan-progress" className="text-base font-semibold">
            Lo que llevas pagado
          </h2>
          <p className="text-2xl font-semibold tabular-nums">
            {formatEur(plan.confirmedCents)}{" "}
            <span className="text-base font-normal text-muted-foreground">de {formatEur(plan.priceCents)}</span>
          </p>
          <PlanProgress priceCents={plan.priceCents} paidCents={plan.confirmedCents} />
          {plan.status === "open" ? (
            <p className="text-sm text-muted-foreground tabular-nums">Te falta {formatEur(remainingCents)}.</p>
          ) : null}
        </div>
        {plan.installments > 1 ? (
          <ol className="divide-y border-t" aria-label="Tus cuotas">
            {lines.map((line) => (
              <li key={line.number} className="flex items-center gap-3 py-3 text-sm">
                <InstallmentIcon state={line.state} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Cuota {line.number}</p>
                  <p className={INSTALLMENT_STATE[line.state].className}>{INSTALLMENT_STATE[line.state].label}</p>
                </div>
                <span className="font-semibold tabular-nums">{formatEur(line.amountCents)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {plan.payments.length > 0 ? (
        <section aria-labelledby="plan-payments" className="space-y-3">
          <h2 id="plan-payments" className="text-lg font-semibold">
            Pagos que enviaste
          </h2>
          <ol className="divide-y rounded-lg border">
            {[...plan.payments].reverse().map((payment) => (
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
                    {payment.method ? ` · ${PLAN_PAYMENT_METHOD_LABELS[payment.method]}` : ""}
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
    </div>
  );
}
