import type { PaymentMethod } from "@/common/lib/db/schema";
import {
  emailButton,
  emailDetails,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatUsd, formatVes } from "@/common/lib/utils/money.util";

import { PAYMENT_METHODS } from "../constants/checkout.constants";

type PaymentSubmittedEmailInput = {
  orderId: string;
  totalCents: number;
  usdToVes: number | null;
  reference: string;
  paymentMethod: PaymentMethod;
  slaHours: number;
  appUrl: string;
};

/** Sent when the customer submits (or resubmits) their payment data. */
export function buildPaymentSubmittedEmail(input: PaymentSubmittedEmailInput) {
  const method =
    PAYMENT_METHODS.find((m) => m.id === input.paymentMethod)?.label ?? input.paymentMethod;
  const usd = formatUsd(input.totalCents);
  const ves = input.usdToVes ? formatVes(input.totalCents, input.usdToVes) : null;
  const orderUrl = `${input.appUrl}/orders/${input.orderId}`;
  const shortId = input.orderId.slice(0, 8).toUpperCase();

  const subject = `Recibimos tu pago del pedido ${shortId}`;

  const text = [
    `Recibimos los datos de tu pago del pedido ${shortId}.`,
    ``,
    `Método: ${method}`,
    `Referencia: ${input.reference}`,
    `Monto: ${usd}${ves ? ` (${ves})` : ""}`,
    ``,
    `Lo verificaremos en menos de ${input.slaHours} horas. Cuando esté aprobado te avisamos por este correo y podrás descargar tus fotos.`,
    ``,
    `Puedes ver el estado aquí: ${orderUrl}`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Referencia ${input.reference}. Lo verificamos en menos de ${input.slaHours} horas.`,
    title: "Recibimos los datos de tu pago",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(`Gracias. Registramos tu pago del pedido <strong>${shortId}</strong>.`) +
      emailDetails([
        { label: "Método", value: escapeHtml(method) },
        { label: "Referencia", value: escapeHtml(input.reference) },
        { label: "Monto", value: `${usd}${ves ? ` <span style="font-weight:400;">(${ves})</span>` : ""}` },
      ]) +
      emailParagraph(
        `Lo verificaremos en menos de ${input.slaHours} horas. Cuando esté aprobado te avisamos por este correo y podrás descargar tus fotos en alta resolución.`,
        { muted: true },
      ) +
      emailButton(orderUrl, "Ver el estado del pedido"),
  });

  return { subject, html, text };
}
