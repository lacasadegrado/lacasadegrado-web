import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoLightbox } from "@/common/components/photo-lightbox/photo-lightbox";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { PHOTO_FORMAT_LABELS } from "@/common/lib/constants/catalog";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { ORDER_STATUS_LABELS } from "@/modules/orders/lib/constants/orders.constants";
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants";

import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, SALE_STATUS_BADGE } from "../lib/constants/sale.constants";
import { getSale } from "../lib/services/sale.service";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </>
  );
}

/** Ventas › one order: the photos bought, the payments reported and the downloads. */
export async function AdminSaleDetailScreen({ orderId }: { orderId: string }) {
  const sale = await getSale(orderId);
  if (!sale) notFound();

  const printCount = sale.items.filter((item) => item.format === "print").length;
  const downloaded = sale.items.filter((item) => item.downloads > 0).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href={ADMIN_PATHS.sales}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Ventas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{sale.buyerName ?? sale.buyerEmail}</h1>
          <Badge variant={SALE_STATUS_BADGE[sale.status]}>{ORDER_STATUS_LABELS[sale.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pedido del {formatDateTime(sale.createdAt)}
          {sale.paidAt ? ` · aprobado el ${formatDateTime(sale.paidAt)}` : ""}
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-[10rem_1fr]">
        <Detail label="Comprador">
          <Link href={ADMIN_PATHS.user(sale.buyerId)} className="underline underline-offset-4">
            {sale.buyerEmail}
          </Link>
        </Detail>
        <Detail label="Total">
          {formatEur(sale.totalCents)}
          {sale.eurToVes ? (
            <span className="font-normal text-muted-foreground"> · {formatVes(sale.totalCents, sale.eurToVes)}</span>
          ) : null}
        </Detail>
        <Detail label="Método">{PAYMENT_METHOD_LABELS[sale.method] ?? sale.method}</Detail>
        <Detail label="Fotos">
          {sale.items.length}
          {printCount > 0 ? ` (${printCount} impresa${printCount === 1 ? "" : "s"})` : ""} · {downloaded} descargada
          {downloaded === 1 ? "" : "s"}
        </Detail>
        {sale.printStatus ? (
          <Detail label="Impresiones">
            {sale.printStatus === "delivered"
              ? `Entregadas${sale.printDeliveredAt ? ` el ${formatDateTime(sale.printDeliveredAt)}` : ""}`
              : "Pendientes de entregar"}
          </Detail>
        ) : null}
        {sale.termsVersion ? <Detail label="Términos aceptados">Versión {sale.termsVersion}</Detail> : null}
      </dl>

      <section aria-labelledby="sale-photos" className="space-y-3">
        <h2 id="sale-photos" className="text-lg font-semibold">
          Fotos compradas
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sale.items.map((item) => {
            const src = PURCHASES_PATHS.viewApi(item.photoId);
            return (
              <li key={item.photoId} className="overflow-hidden rounded-lg border bg-card">
                <div className="relative bg-muted" style={{ aspectRatio: `${item.width} / ${item.height}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <PhotoLightbox src={src} alt={item.filename} width={item.width} height={item.height} />
                </div>
                <div className="space-y-1 p-3 text-sm">
                  <p className="truncate font-mono text-xs" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="truncate text-muted-foreground">{item.eventName}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={item.format === "print" ? "secondary" : "outline"}>
                      {PHOTO_FORMAT_LABELS[item.format]}
                    </Badge>
                    <span className="font-medium tabular-nums">{formatEur(item.unitPriceCents)}</span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Download aria-hidden="true" className="size-3" />
                    {item.downloads === 0
                      ? "Sin descargar"
                      : `${item.downloads} descarga${item.downloads === 1 ? "" : "s"}${
                          item.lastDownloadAt ? ` · última ${formatDateTime(item.lastDownloadAt)}` : ""
                        }`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="sale-payments" className="space-y-3">
        <h2 id="sale-payments" className="text-lg font-semibold">
          Pagos reportados
        </h2>
        {sale.payments.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            La persona todavía no reportó un pago para este pedido.
          </p>
        ) : (
          <ol className="space-y-3">
            {sale.payments.map((payment) => (
              <li key={payment.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      payment.status === "verified" ? "default" : payment.status === "rejected" ? "destructive" : "secondary"
                    }
                  >
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Reportado el {formatDateTime(payment.submittedAt)}</span>
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
                  <Detail label="Referencia">{payment.reference}</Detail>
                  <Detail label="Monto">{formatEur(payment.amountCents)}</Detail>
                  <Detail label="Pagó">
                    {payment.payerName}
                    {payment.payerPhone ? ` · ${payment.payerPhone}` : ""}
                    {payment.payerBank ? ` · ${payment.payerBank}` : ""}
                  </Detail>
                  {payment.verifiedAt ? (
                    <Detail label={payment.status === "rejected" ? "Rechazado" : "Aprobado"}>
                      {formatDateTime(payment.verifiedAt)}
                      {payment.verifiedByEmail ? ` por ${payment.verifiedByEmail}` : ""}
                    </Detail>
                  ) : null}
                  {payment.rejectionReason ? <Detail label="Motivo">{payment.rejectionReason}</Detail> : null}
                </dl>
                {payment.hasProof ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={ADMIN_PATHS.paymentProofApi(payment.id)} target="_blank" rel="noreferrer">
                      <FileText aria-hidden="true" /> Ver comprobante
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
