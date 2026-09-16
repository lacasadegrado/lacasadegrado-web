import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { BUSINESS } from "@/common/lib/config/business.config";
import { formatRate, formatEur, formatVes, formatVesNumber } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { ORDERS_PATHS } from "@/modules/orders/lib/constants/orders.constants";
import { getOrderForUser } from "@/modules/orders/lib/services/order.service";

import { PaymentDetails } from "../components/payment-details";
import { PaymentForm } from "../components/payment-form";
import {
  CHECKOUT_PATHS,
  PAYMENT_METHODS,
  PAYMENT_STEPS,
  type PaymentStep,
} from "../lib/constants/checkout.constants";

type PaymentScreenProps = {
  orderId: string;
  /** Raw query value; anything unknown falls back to the natural step. */
  step?: string;
};

function resolveStep(raw: string | undefined, isResubmission: boolean): PaymentStep {
  if (raw === PAYMENT_STEPS.pay || raw === PAYMENT_STEPS.report) return raw;
  // A rejected order was already paid once: straight to reporting again.
  return isResubmission ? PAYMENT_STEPS.report : PAYMENT_STEPS.pay;
}

/**
 * Two steps on one URL: first pay (amount, receiving details, copy
 * buttons), then report the payment (reference, payer, proof). The step
 * lives in the query string so refresh and the back button keep the place.
 */
export async function PaymentScreen({ orderId, step: rawStep }: PaymentScreenProps) {
  const user = await requireSessionUser(CHECKOUT_PATHS.payment(orderId));
  const order = await getOrderForUser(user, orderId);
  if (!order) notFound();
  if (order.status !== "pending_payment" && order.status !== "rejected") {
    redirect(ORDERS_PATHS.order(order.id));
  }

  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  const isResubmission = order.status === "rejected";
  const lastRejection = order.payments.find((p) => p.status === "rejected");
  const step = resolveStep(rawStep, isResubmission);
  const shortId = order.id.slice(0, 8).toUpperCase();
  const photoCount = `${order.items.length} foto${order.items.length === 1 ? "" : "s"}`;
  const amountVes = order.eurToVes ? formatVesNumber(order.totalCents, order.eurToVes) : null;

  if (step === PAYMENT_STEPS.pay) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Paso 1 de 2</p>
          <h1 className="mt-1 text-2xl font-bold">Paga con {method?.label ?? "tu banco"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {shortId} · {photoCount}. Haz el pago desde la app de tu banco con estos datos.
          </p>
        </div>

        <section className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Monto exacto a pagar</p>
          {order.eurToVes ? (
            <>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {formatVes(order.totalCents, order.eurToVes)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatEur(order.totalCents)} a {formatRate(order.eurToVes)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatEur(order.totalCents)}</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Datos para {method?.label ?? "el pago"}</h2>
          <PaymentDetails method={order.paymentMethod} amountVes={amountVes} />
          <p className="text-sm text-muted-foreground">
            Paga el monto exacto. Si el monto no coincide, la verificación tarda más.
          </p>
        </section>

        <div className="space-y-3">
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link href={CHECKOUT_PATHS.payment(order.id, PAYMENT_STEPS.report)}>Ya pagué</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            En el siguiente paso nos das la referencia del pago. Puedes volver a estos datos
            cuando quieras.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={CHECKOUT_PATHS.payment(order.id, PAYMENT_STEPS.pay)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Ver los datos de pago
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          {isResubmission ? "Nuevo intento" : "Paso 2 de 2 · Último paso"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {isResubmission ? "Envía nuevos datos de pago" : "Reporta tu pago"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedido {shortId} · {photoCount}
          {amountVes ? ` · Bs. ${amountVes}` : ` · ${formatEur(order.totalCents)}`}
        </p>
      </div>

      {isResubmission && lastRejection ? (
        <Alert role="status">
          <AlertDescription>
            Tu pago anterior fue rechazado
            {lastRejection.rejectionReason ? `: ${lastRejection.rejectionReason}` : "."} Revisa los
            datos y vuelve a enviarlos.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4 rounded-md border p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Cuéntanos del pago</h2>
          <p className="text-sm text-muted-foreground">
            Con estos datos lo verificamos en menos de {BUSINESS.verificationSlaHours} horas y te
            avisamos por correo.
          </p>
        </div>
        <PaymentForm orderId={order.id} isResubmission={isResubmission} />
      </section>
    </div>
  );
}
