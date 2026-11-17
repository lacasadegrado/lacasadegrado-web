import { ArrowLeftRight, Banknote, ChevronRight, MessageCircle, Smartphone, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CopyButton } from "@/common/components/copy-button/copy-button";
import { Button } from "@/common/components/ui/button";
import { BUSINESS } from "@/common/lib/config/business.config";
import type { PaymentMethod, PlanPaymentMethod } from "@/common/lib/db/schema";
import { formatEur, formatRate, formatVes, formatVesNumber } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { PaymentDetails } from "@/modules/checkout/components/payment-details";
import { PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants";
import { getPaymentAccounts } from "@/modules/checkout/lib/services/payment-account.service";
import { amountForInstallments } from "@/modules/forms/lib/utils/installments.util";

import { PayBottomBar, PayStepHeader } from "../components/plan-pay-steps/pay-chrome";
import { InstallmentStep } from "../components/plan-pay-steps/installment-step";
import { PlanPaymentForm } from "../components/plan-payment-form/plan-payment-form";
import { PlanSummaryCard } from "../components/plan-summary-card/plan-summary-card";
import {
  PLAN_CONTACT_METHODS,
  PLAN_PAY_STEPS,
  PLAN_PAYMENT_METHOD_LABELS,
  PLANS_PATHS,
  type PlanPayStep,
} from "../lib/constants/plans.constants";
import { getPlanForEmail } from "../lib/services/customer-plan.service";
import { installmentCountLabel } from "../lib/utils/plan-installments.util";

type MethodOption = {
  id: PlanPaymentMethod;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Bank methods show our receiving details; the rest ask for them by WhatsApp. */
  kind: "bank" | "contact";
};

const METHOD_ICONS: Record<PlanPaymentMethod, LucideIcon> = {
  pago_movil: Smartphone,
  bank_transfer: ArrowLeftRight,
  binance: Wallet,
  cash: Banknote,
};

const METHOD_OPTIONS: MethodOption[] = [
  ...PAYMENT_METHODS.filter((method) => method.enabled && method.kind === "manual").map((method) => ({
    id: method.id as PlanPaymentMethod,
    label: method.label,
    description: method.description,
    icon: METHOD_ICONS[method.id as PlanPaymentMethod],
    kind: "bank" as const,
  })),
  ...PLAN_CONTACT_METHODS.map((method) => ({
    id: method.id,
    label: method.label,
    description: method.description,
    icon: METHOD_ICONS[method.id],
    kind: "contact" as const,
  })),
];

/** What to write in step 4 for each method; matches the flyer sent to customers. */
const REPORT_HINTS: Record<PlanPaymentMethod, string> = {
  pago_movil: "Escribe el número de referencia que te dio tu banco y sube la captura del pago.",
  bank_transfer: "Escribe el número de referencia que te dio tu banco y sube la captura de la transferencia.",
  binance: "Escribe el ID de la orden de Binance como referencia y sube la captura del pago.",
  cash: "Escribe «Efectivo» como referencia y sube una foto de los billetes que entregaste.",
};

type PlanPayScreenProps = {
  planId: string;
  /** Raw query values; anything invalid sends the person back to the step that fixes it. */
  query: { paso?: string; cuotas?: string; metodo?: string };
};

/**
 * `/dashboard/payments/<planId>/pay`: the "Pagar" stepper, one question per
 * screen like a phone app. 1 how many installments, 2 how, 3 the details
 * to pay with, 4 report it. Every choice lives in the URL, so the back
 * button and a refresh keep the place.
 */
export async function PlanPayScreen({ planId, query }: PlanPayScreenProps) {
  if (!z.uuid().safeParse(planId).success) notFound();
  const user = await requireSessionUser(PLANS_PATHS.pay(planId));
  const plan = await getPlanForEmail(planId, user.email);
  if (!plan) notFound();

  const remaining = plan.installments - plan.reservedInstallments;
  if (plan.status !== "open" || remaining <= 0) redirect(PLANS_PATHS.plan(plan.id));

  const parsedCount = Number(query.cuotas);
  const count = Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= remaining ? parsedCount : null;
  const method = METHOD_OPTIONS.find((option) => option.id === query.metodo) ?? null;
  const requested = (PLAN_PAY_STEPS as readonly string[]).includes(query.paso ?? "")
    ? (query.paso as PlanPayStep)
    : "cuotas";
  const step: PlanPayStep =
    requested === "cuotas" || !count ? "cuotas" : requested === "metodo" || !method ? "metodo" : requested;

  const totalCents = count
    ? amountForInstallments(plan.priceCents, plan.installments, plan.reservedInstallments, count)
    : 0;
  const what = plan.installments === 1 ? "el paquete" : installmentCountLabel(count ?? 1);

  if (step === "cuotas") {
    return (
      <div className="mx-auto max-w-lg space-y-6 pb-44">
        <PayStepHeader step="cuotas" backHref={PLANS_PATHS.plan(plan.id)} title="¿Cuánto quieres pagar?" />
        <PlanSummaryCard plan={plan} />
        <InstallmentStep
          planId={plan.id}
          priceCents={plan.priceCents}
          installments={plan.installments}
          reserved={plan.reservedInstallments}
          eurToVes={plan.eurToVes}
          initialCount={count}
        />
      </div>
    );
  }

  const bar = (children?: React.ReactNode) => (
    <PayBottomBar totalCents={totalCents} eurToVes={plan.eurToVes} count={count} installments={plan.installments}>
      {children}
    </PayBottomBar>
  );

  if (step === "metodo") {
    return (
      <div className="mx-auto max-w-lg space-y-6 pb-36">
        <PayStepHeader
          step="metodo"
          backHref={PLANS_PATHS.pay(plan.id, { step: "cuotas", count: count ?? undefined })}
          title="¿Cómo vas a pagar?"
        />
        <ul className="space-y-3">
          {METHOD_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <li key={option.id}>
                <Link
                  href={PLANS_PATHS.pay(plan.id, { step: "datos", count: count ?? undefined, method: option.id })}
                  className={`flex min-h-16 items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-amber ${method?.id === option.id ? "border-amber" : ""}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
        {bar()}
      </div>
    );
  }

  // From here on both choices are set.
  const chosen = method!;
  const back = (to: PlanPayStep) => PLANS_PATHS.pay(plan.id, { step: to, count: count!, method: chosen.id });

  if (step === "datos") {
    const accounts = chosen.kind === "bank" ? (await getPaymentAccounts()).accounts : null;
    const amountVes = plan.eurToVes ? formatVesNumber(totalCents, plan.eurToVes) : null;
    const contactText = `Hola, quiero pagar ${what} de mi ${plan.packageName} (${plan.eventName}) con ${chosen.label}: ${formatEur(totalCents)}.${plan.personName ? ` Graduando: ${plan.personName}.` : ""} Mi correo es ${user.email}.`;

    return (
      <div className="mx-auto max-w-lg space-y-6 pb-44">
        <PayStepHeader step="datos" backHref={back("metodo")} title={`Paga con ${chosen.label}`} />

        <section className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Monto a pagar · {what}</p>
          {chosen.kind === "bank" && plan.eurToVes ? (
            <>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatVes(totalCents, plan.eurToVes)}</p>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {formatEur(totalCents)} a {formatRate(plan.eurToVes)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatEur(totalCents)}</p>
          )}
        </section>

        {chosen.kind === "bank" && accounts ? (
          <section className="space-y-3">
            <h2 className="font-sans text-base font-semibold">1. Paga desde la app de tu banco con estos datos</h2>
            <PaymentDetails method={chosen.id as PaymentMethod} accounts={accounts} amountVes={amountVes} />
          </section>
        ) : (
          <section className="space-y-3 rounded-lg border p-4">
            <h2 className="font-sans text-base font-semibold">1. Escríbenos para pagar con {chosen.label}</h2>
            <p className="text-sm">
              {chosen.id === "cash" ? "Escríbenos al " : "Pídenos los datos al "}
              <strong className="tabular-nums">{BUSINESS.paymentContact.phone}</strong>
              {chosen.id === "cash" ? " para acordar dónde entregar el efectivo" : ""}. El mensaje ya va escrito, solo
              tienes que enviarlo.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="h-12">
                <a
                  href={`https://wa.me/${BUSINESS.paymentContact.whatsapp}?text=${encodeURIComponent(contactText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" />
                  Escribir por WhatsApp
                </a>
              </Button>
              <CopyButton
                text={BUSINESS.paymentContact.phone.replace(/\D/g, "")}
                label="Copiar número"
                copiedLabel="Número copiado"
                variant="outline"
                size="lg"
                className="h-12"
              />
            </div>
          </section>
        )}

        <section className="space-y-1">
          <h2 className="font-sans text-base font-semibold">2. Cuando hayas pagado, toca «Ya pagué»</h2>
          <p className="text-sm text-muted-foreground">{REPORT_HINTS[chosen.id]}</p>
        </section>

        {bar(
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link href={back("reportar")}>Ya pagué</Link>
          </Button>,
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <PayStepHeader step="reportar" backHref={back("datos")} title="Reporta tu pago" />

      <section className="space-y-1 rounded-lg border bg-card p-4 text-sm">
        <p className="text-muted-foreground">Vas a reportar</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatEur(totalCents)}
          {plan.eurToVes && chosen.kind === "bank" ? (
            <span className="font-normal text-muted-foreground"> · {formatVes(totalCents, plan.eurToVes)}</span>
          ) : null}
        </p>
        <p>
          {plan.installments === 1 ? "Todo el paquete" : what} · {PLAN_PAYMENT_METHOD_LABELS[chosen.id]}
        </p>
      </section>

      <p className="text-sm text-muted-foreground">{REPORT_HINTS[chosen.id]}</p>

      <PlanPaymentForm planId={plan.id} fields={plan.fields} count={count!} method={chosen.id} />
    </div>
  );
}
