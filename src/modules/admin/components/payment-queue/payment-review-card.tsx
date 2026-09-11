import { Badge } from "@/common/components/ui/badge";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatRate, formatUsd, formatVes } from "@/common/lib/utils/money.util";
import { PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import type { PaymentReviewItem } from "../../lib/types/payment-review.types";
import { ReviewActions } from "./review-actions";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums break-all">{value}</dd>
    </div>
  );
}

export function PaymentReviewCard({ item }: { item: PaymentReviewItem }) {
  const method = PAYMENT_METHODS.find((m) => m.id === item.method)?.label ?? item.method;
  const proofUrl = ADMIN_PATHS.paymentProofApi(item.payment.id);
  const amountMismatch = item.payment.amountCents !== item.totalCents;

  return (
    <article className="grid gap-5 rounded-md border p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-4">
        <header className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">
            Pedido {item.orderId.slice(0, 8).toUpperCase()}
          </h3>
          <Badge variant="outline">{method}</Badge>
          {item.previousRejections > 0 ? (
            <Badge variant="secondary">
              Reenvío · {item.previousRejections} rechazo{item.previousRejections === 1 ? "" : "s"}
            </Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            enviado {formatDateTime(item.payment.submittedAt)}
          </span>
        </header>

        <div className="grid gap-x-8 sm:grid-cols-2">
          <dl className="divide-y">
            <Row label="Cliente" value={item.customerEmail} />
            <Row label="Fotos" value={String(item.itemCount)} />
            <Row
              label="Debe pagar"
              value={
                item.usdToVes
                  ? `${formatVes(item.totalCents, item.usdToVes)} (${formatUsd(item.totalCents)} a ${formatRate(item.usdToVes)})`
                  : formatUsd(item.totalCents)
              }
            />
          </dl>
          <dl className="divide-y">
            <Row label="Referencia" value={item.payment.reference} />
            <Row label="Pagó" value={item.payment.payerName} />
            <Row label="Teléfono" value={item.payment.payerPhone ?? "—"} />
            <Row label="Banco" value={item.payment.payerBank ?? "—"} />
          </dl>
        </div>

        {amountMismatch ? (
          <p className="text-sm font-medium">
            El monto declarado ({formatUsd(item.payment.amountCents)}) no coincide con el total del
            pedido.
          </p>
        ) : null}

        <ReviewActions
          orderId={item.orderId}
          customerEmail={item.customerEmail}
          totalCents={item.totalCents}
          reference={item.payment.reference}
        />
      </div>

      <aside>
        {item.payment.hasProof ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md border bg-muted"
            aria-label="Abrir captura del comprobante en una pestaña nueva"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofUrl}
              alt={`Comprobante enviado por ${item.payment.payerName}`}
              loading="lazy"
              decoding="async"
              className="max-h-72 w-full object-contain"
            />
          </a>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Sin captura. Verifica por referencia y monto.
          </p>
        )}
      </aside>
    </article>
  );
}
