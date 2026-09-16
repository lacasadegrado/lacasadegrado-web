import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/common/components/ui/button";
import { PHOTO_FORMAT_LABELS } from "@/common/lib/constants/catalog";
import { BUSINESS } from "@/common/lib/config/business.config";
import { formatRate, formatEur, formatVes } from "@/common/lib/utils/money.util";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { CHECKOUT_PATHS, PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import { OrderStatusTimeline } from "../components/order-status-timeline";
import { ORDER_STATUS_LABELS, ORDERS_PATHS } from "../lib/constants/orders.constants";
import { getOrderForUser } from "../lib/services/order.service";

export async function OrderScreen({ orderId }: { orderId: string }) {
  const user = await requireSessionUser(ORDERS_PATHS.order(orderId));
  const order = await getOrderForUser(user, orderId);
  if (!order) notFound();

  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  const printCount = order.items.filter((item) => item.format === "print").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Pedido {order.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="text-2xl font-bold">{ORDER_STATUS_LABELS[order.status]}</h1>
          {order.status === "pending_verification" ? (
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              Estamos verificando tu pago. Normalmente toma menos de{" "}
              {BUSINESS.verificationSlaHours} horas. Te avisamos por correo en cuanto esté
              aprobado y tus fotos quedarán listas para descargar.
            </p>
          ) : null}
          {order.status === "paid" ? (
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              Tu pago fue aprobado. Ya puedes descargar tus fotos en alta resolución.
              {printCount > 0
                ? order.printStatus === "delivered"
                  ? " Tu foto impresa ya está en tu institución."
                  : ` Tu foto impresa llega a tu institución en unos ${BUSINESS.print.deliveryDays} días.`
                : ""}
            </p>
          ) : null}
          {printCount > 0 ? (
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Las fotos impresas se entregan en la institución, que se encarga de hacerlas
              llegar a cada persona. Pasados {BUSINESS.print.responsibilityDays} días desde esa
              entrega, La Casa de Grado no se hace responsable de la foto impresa.
            </p>
          ) : null}
        </div>

        <section aria-labelledby="timeline-heading" className="space-y-4">
          <h2 id="timeline-heading" className="text-base font-semibold">
            Estado
          </h2>
          <OrderStatusTimeline order={order} />
        </section>

        <div className="flex flex-wrap gap-3">
          {order.status === "pending_payment" ? (
            <Button asChild size="lg" className="h-11">
              <Link href={CHECKOUT_PATHS.payment(order.id)}>Pagar ahora</Link>
            </Button>
          ) : null}
          {order.status === "rejected" ? (
            <Button asChild size="lg" className="h-11">
              <Link href={CHECKOUT_PATHS.payment(order.id)}>Enviar nuevos datos de pago</Link>
            </Button>
          ) : null}
          {order.status === "paid" ? (
            <Button asChild size="lg" className="h-11">
              <Link href={GALLERY_PATHS.purchases}>Ver mis compras</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href={GALLERY_PATHS.dashboard}>Volver a mis fotos</Link>
          </Button>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-md border p-4">
        <h2 className="text-base font-semibold">Resumen</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.photoId} className="flex items-center gap-3 py-2">
              <div
                className="w-14 shrink-0 overflow-hidden rounded-sm bg-muted"
                style={{ aspectRatio: `${item.width} / ${item.height}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={GALLERY_PATHS.previewApi(item.photoId)}
                  alt=""
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.eventName}</p>
                <p className="text-xs text-muted-foreground">{PHOTO_FORMAT_LABELS[item.format]}</p>
              </div>
              <p className="text-sm tabular-nums">{formatEur(item.unitPriceCents)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatEur(order.totalCents)}</dd>
          </div>
          {order.eurToVes ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>En bolívares</dt>
              <dd className="tabular-nums">{formatVes(order.totalCents, order.eurToVes)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-muted-foreground">
            <dt>Método</dt>
            <dd>{method?.label ?? order.paymentMethod}</dd>
          </div>
          {order.eurToVes ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>Tasa</dt>
              <dd className="tabular-nums">{formatRate(order.eurToVes)}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}
