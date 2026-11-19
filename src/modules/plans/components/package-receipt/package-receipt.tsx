import { CircleCheck } from "lucide-react";

import { Logo } from "@/common/components/logo/logo";
import { BUSINESS } from "@/common/lib/config/business.config";
import { formatDateLong } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";

import { PLAN_PAYMENT_METHOD_LABELS } from "../../lib/constants/plans.constants";
import type { PlanReceiptData } from "../../lib/types/plans.types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

/**
 * The receipt of a fully paid package, the same for the person (Pagos)
 * and the admin. `data-receipt` makes it the only thing that prints
 * (globals.css), in teal on white whatever the theme.
 */
export function PackageReceipt({ receipt }: { receipt: PlanReceiptData }) {
  return (
    <article data-receipt aria-labelledby="receipt-title" className="space-y-6 rounded-lg border bg-card p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <Logo title={BUSINESS.name} className="h-10" />
        <div className="text-right">
          <p id="receipt-title" className="text-lg font-semibold">
            Recibo de pago
          </p>
          <p className="text-sm tabular-nums">N° {receipt.number}</p>
          <p className="text-sm text-muted-foreground">{formatDateLong(receipt.paidAt)}</p>
        </div>
      </header>

      <div className="flex items-center gap-3 rounded-md border border-primary p-3">
        <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-primary" />
        <p className="font-semibold">Paquete pagado completo el {formatDateLong(receipt.paidAt)}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={receipt.personName ?? "—"} />
        <Field label="Correo" value={receipt.email ?? "—"} />
        <Field label="Evento" value={receipt.eventName} />
        <Field
          label="Paquete"
          value={`${receipt.packageName} · ${formatEur(receipt.priceCents)}${receipt.installments > 1 ? ` en ${receipt.installments} cuotas` : ""}`}
        />
      </dl>

      <section aria-labelledby="receipt-payments" className="space-y-2">
        <h2 id="receipt-payments" className="font-sans text-base font-semibold">
          Pagos recibidos
        </h2>
        <ol className="divide-y rounded-md border">
          {receipt.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {formatDateLong(payment.date)}
                  {receipt.installments > 1
                    ? ` · ${payment.installmentsCovered} cuota${payment.installmentsCovered === 1 ? "" : "s"}`
                    : ""}
                </p>
                <p className="text-muted-foreground break-words">
                  {payment.method ? PLAN_PAYMENT_METHOD_LABELS[payment.method] : "Pago"}
                  {payment.reference ? ` · Ref. ${payment.reference}` : ""}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-semibold">{formatEur(payment.amountCents)}</p>
                {payment.eurToVes && (payment.method === "pago_movil" || payment.method === "bank_transfer") ? (
                  <p className="text-xs text-muted-foreground">{formatVes(payment.amountCents, payment.eurToVes)}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex items-baseline justify-between gap-4 border-t-2 pt-3">
          <span className="text-base font-semibold">Total pagado</span>
          <span className="text-xl font-bold tabular-nums">{formatEur(receipt.totalCents)}</span>
        </div>
      </section>

      <footer className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
        <p>
          {BUSINESS.name} confirma que recibió estos pagos por el paquete indicado. Este recibo no es una factura
          fiscal.
        </p>
        <p>Dudas: {BUSINESS.paymentContact.phone} (WhatsApp).</p>
      </footer>
    </article>
  );
}
