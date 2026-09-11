import { notFound, redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { BUSINESS } from "@/common/lib/config/business.config";
import { formatRate, formatUsd, formatVes, formatVesNumber } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { ORDERS_PATHS } from "@/modules/orders/lib/constants/orders.constants";
import { getOrderForUser } from "@/modules/orders/lib/services/order.service";

import { PaymentDetails } from "../components/payment-details";
import { PaymentForm } from "../components/payment-form";
import { CHECKOUT_PATHS, PAYMENT_METHODS } from "../lib/constants/checkout.constants";

export async function PaymentScreen({ orderId }: { orderId: string }) {
  const user = await requireSessionUser(CHECKOUT_PATHS.payment(orderId));
  const order = await getOrderForUser(user, orderId);
  if (!order) notFound();
  if (order.status !== "pending_payment" && order.status !== "rejected") {
    redirect(ORDERS_PATHS.order(order.id));
  }

  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  const isResubmission = order.status === "rejected";
  const lastRejection = order.payments.find((p) => p.status === "rejected");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isResubmission ? "Envía nuevos datos de pago" : `Paga con ${method?.label ?? "tu banco"}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {order.id.slice(0, 8).toUpperCase()} · {order.items.length} foto
            {order.items.length === 1 ? "" : "s"}
          </p>
        </div>

        {isResubmission && lastRejection ? (
          <Alert role="status">
            <AlertDescription>
              Tu pago anterior fue rechazado
              {lastRejection.rejectionReason ? `: ${lastRejection.rejectionReason}` : "."} Revisa
              los datos y vuelve a enviarlos.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Monto exacto a pagar</p>
          {order.usdToVes ? (
            <>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {formatVes(order.totalCents, order.usdToVes)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatUsd(order.totalCents)} a {formatRate(order.usdToVes)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatUsd(order.totalCents)}</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Datos para {method?.label ?? "el pago"}</h2>
          <PaymentDetails
            method={order.paymentMethod}
            amountVes={order.usdToVes ? formatVesNumber(order.totalCents, order.usdToVes) : null}
          />
          <p className="text-sm text-muted-foreground">
            Paga el monto exacto. Si el monto no coincide, la verificación tarda más.
          </p>
        </section>
      </div>

      <section className="space-y-4 rounded-md border p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Cuando hayas pagado</h2>
          <p className="text-sm text-muted-foreground">
            Envíanos estos datos. Verificamos en menos de {BUSINESS.verificationSlaHours} horas y
            te avisamos por correo.
          </p>
        </div>
        <PaymentForm orderId={order.id} isResubmission={isResubmission} />
      </section>
    </div>
  );
}
