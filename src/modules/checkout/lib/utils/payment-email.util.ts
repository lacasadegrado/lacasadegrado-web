import type { PaymentMethod } from "@/common/lib/db/schema";
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain, monochrome, text-first. Renders everywhere; no images. */
export function buildPaymentSubmittedEmail(input: PaymentSubmittedEmailInput) {
  const method = PAYMENT_METHODS.find((m) => m.id === input.paymentMethod)?.label ?? input.paymentMethod;
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

  const html = `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#135065;max-width:480px;margin:0 auto;padding:32px 24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px;">La Casa de Grado</p>
  <p style="font-size:16px;line-height:24px;margin:0 0 16px;">Recibimos los datos de tu pago del pedido <strong>${shortId}</strong>.</p>
  <table style="border-collapse:collapse;font-size:14px;line-height:22px;margin:0 0 24px;">
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Método</td><td>${escapeHtml(method)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Referencia</td><td>${escapeHtml(input.reference)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Monto</td><td>${usd}${ves ? ` <span style="color:#4B6772;">(${ves})</span>` : ""}</td></tr>
  </table>
  <p style="font-size:14px;line-height:22px;color:#4B6772;margin:0 0 16px;">Lo verificaremos en menos de ${input.slaHours} horas. Cuando esté aprobado te avisamos por este correo y podrás descargar tus fotos.</p>
  <p style="font-size:14px;line-height:22px;margin:0;"><a href="${orderUrl}" style="color:#135065;">Ver el estado del pedido</a></p>
</div>`;

  return { subject, html, text };
}
