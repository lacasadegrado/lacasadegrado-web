import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/common/components/ui/badge";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { FORM_SYSTEM_FIELDS } from "@/modules/forms/lib/constants/forms.constants";

import { PackageReviewActions } from "../components/package-payments/package-review-actions";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { PACKAGE_PAYMENT_STATUS_BADGE, PACKAGE_PAYMENT_STATUS_LABELS } from "../lib/constants/sale.constants";
import { getPackagePayment } from "../lib/services/package-payment.service";

type DetailProps = {
  submissionId: string;
  /** Set on a general form's route: the submission must belong to that form. */
  formId?: string;
};

/**
 * One submission, every answer in the order the person saw it. Read-only.
 * Serves both kinds: payment forms (under Pagos › Paquetes) show the
 * package, reference and proof; general forms (under their form) do not.
 */
export async function AdminPackagePaymentDetailScreen({ submissionId, formId }: DetailProps) {
  if (!z.uuid().safeParse(submissionId).success) notFound();
  if (formId !== undefined && !z.uuid().safeParse(formId).success) notFound();
  const payment = await getPackagePayment(submissionId);
  if (!payment) notFound();
  // Each kind has its own route; a mismatched URL is a 404, not a different layout.
  if (formId !== undefined ? payment.formId !== formId || payment.formKind !== "general" : payment.formKind !== "package_payment") {
    notFound();
  }
  const isPayment = payment.formKind === "package_payment";
  const backHref = isPayment
    ? `${ADMIN_PATHS.packagePayments}?event=${payment.eventId}&form=${payment.formId}`
    : ADMIN_PATHS.formResponses(payment.formId);
  const title = payment.personName ?? payment.email ?? "Respuesta sin correo";

  // Answers sent before abonos existed have no amount: they paid the package price.
  const amountCents = payment.amountCents ?? payment.packagePriceCents;
  const proofUrl = ADMIN_PATHS.packagePaymentFileApi(payment.id, "proof", 0);
  const proofIsImage = payment.answers.find((answer) => answer.fieldId === "proof")?.files[0]?.isImage ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Respuestas de {payment.formTitle}
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {payment.personName && payment.email ? `${payment.email} · ` : ""}
          {payment.eventName} · enviado el {formatDateTime(payment.submittedAt)}
        </p>
      </div>

      {isPayment ? (
        <section aria-labelledby="review-heading" className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="review-heading" className="text-lg font-semibold">
              Pago
            </h2>
            {payment.paymentStatus ? (
              <Badge variant={PACKAGE_PAYMENT_STATUS_BADGE[payment.paymentStatus]}>
                {PACKAGE_PAYMENT_STATUS_LABELS[payment.paymentStatus]}
              </Badge>
            ) : null}
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Paquete</dt>
              <dd className="font-medium">
                {payment.packageName ?? "Sin paquete"}
                {payment.packagePriceCents !== null ? (
                  <span className="font-normal text-muted-foreground"> · {formatEur(payment.packagePriceCents)}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Monto de este pago</dt>
              <dd className="font-medium tabular-nums">
                {amountCents !== null ? formatEur(amountCents) : "—"}
                {amountCents !== null && payment.eurToVes ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {formatVes(amountCents, payment.eurToVes)} · tasa {payment.eurToVes.toFixed(2)}
                  </span>
                ) : null}
                {payment.installmentsCovered && payment.planInstallments && payment.planInstallments > 1 ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {payment.installmentsCovered} de {payment.planInstallments} cuotas
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Referencia</dt>
              <dd className="font-mono font-medium">{payment.reference ?? "—"}</dd>
            </div>
          </dl>
          {payment.reviewedAt ? (
            <p className="text-sm text-muted-foreground">
              {payment.paymentStatus === "rejected" ? "Rechazado" : "Confirmado"} el {formatDateTime(payment.reviewedAt)}
              {payment.reviewedByEmail ? ` por ${payment.reviewedByEmail}` : ""}
              {payment.rejectionReason ? `. Motivo: ${payment.rejectionReason}` : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            {payment.paymentStatus === "pending" ? (
              <PackageReviewActions
                submissionId={payment.id}
                who={title}
                amountCents={amountCents ?? 0}
                reference={payment.reference}
              />
            ) : (
              <span />
            )}
            {payment.planId ? (
              <Link href={ADMIN_PATHS.packagePlan(payment.planId)} className="text-sm underline underline-offset-4">
                Ver plan de pagos completo
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {payment.hasProof ? (
        <section aria-labelledby="proof-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="proof-heading" className="text-lg font-semibold">
              Comprobante
            </h2>
            <a
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              Abrir en otra pestaña <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
          {proofIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofUrl}
              alt={`Comprobante de pago de ${title}`}
              className="max-h-[32rem] w-auto rounded-lg border bg-muted object-contain"
            />
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Es un PDF: ábrelo en otra pestaña para verlo.
            </p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="answers-heading" className="space-y-3">
        <h2 id="answers-heading" className="text-lg font-semibold">
          Respuestas
        </h2>
        <dl className="divide-y rounded-lg border">
          {payment.answers.map((answer) => (
            <div key={answer.fieldId} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="flex items-start gap-1.5 text-sm text-muted-foreground">
                {answer.label}
                {answer.fieldId in FORM_SYSTEM_FIELDS ? (
                  <Badge variant="outline" className="gap-1 text-[0.65rem]">
                    <Lock aria-hidden="true" className="size-3" /> Sistema
                  </Badge>
                ) : null}
              </dt>
              <dd className="min-w-0 break-words">
                {answer.files.length > 0 ? (
                  <ul className="space-y-1">
                    {answer.files.map((file) => (
                      <li key={file.index}>
                        <a
                          href={ADMIN_PATHS.packagePaymentFileApi(payment.id, answer.fieldId, file.index)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4"
                        >
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : answer.text ? (
                  <span className="whitespace-pre-line">{answer.text}</span>
                ) : (
                  <span className="text-muted-foreground">Sin respuesta</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Versión {payment.formVersion} del formulario: las preguntas se muestran tal como las vio la
          persona al enviar.
        </p>
      </section>
    </div>
  );
}
