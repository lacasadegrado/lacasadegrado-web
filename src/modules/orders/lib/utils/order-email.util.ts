import { formatUsd } from "@/common/lib/utils/money.util";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#135065;max-width:480px;margin:0 auto;padding:32px 24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px;">La Casa de Grado</p>
  ${bodyHtml}
</div>`;
}

type ApprovedInput = {
  orderId: string;
  totalCents: number;
  photoCount: number;
  appUrl: string;
};

/** "Your photos are ready." Sent once an admin verifies the payment. */
export function buildPaymentApprovedEmail(input: ApprovedInput) {
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  const purchasesUrl = `${input.appUrl}/dashboard/purchases`;
  const photos = `${input.photoCount} foto${input.photoCount === 1 ? "" : "s"}`;

  const subject = `Tus fotos están listas · pedido ${shortId}`;
  const text = [
    `Confirmamos tu pago del pedido ${shortId} (${formatUsd(input.totalCents)}).`,
    ``,
    `Ya puedes descargar ${photos} en alta resolución, sin marca de agua:`,
    purchasesUrl,
    ``,
    `Gracias por confiar en La Casa de Grado.`,
  ].join("\n");

  const html = wrap(`
  <p style="font-size:16px;line-height:24px;margin:0 0 16px;">Confirmamos tu pago del pedido <strong>${shortId}</strong> (${formatUsd(input.totalCents)}).</p>
  <p style="font-size:16px;line-height:24px;margin:0 0 24px;">Ya puedes descargar ${photos} en alta resolución, sin marca de agua.</p>
  <p style="margin:0 0 24px;"><a href="${purchasesUrl}" style="display:inline-block;background:#135065;color:#F1ECE8;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px;">Descargar mis fotos</a></p>
  <p style="font-size:14px;line-height:22px;color:#4B6772;margin:0;">Gracias por confiar en La Casa de Grado.</p>`);

  return { subject, html, text };
}

type RejectedInput = {
  orderId: string;
  reason: string;
  appUrl: string;
};

/** Payment could not be confirmed; explains why and how to resubmit. */
export function buildPaymentRejectedEmail(input: RejectedInput) {
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  const paymentUrl = `${input.appUrl}/checkout/${input.orderId}/payment`;

  const subject = `No pudimos confirmar tu pago · pedido ${shortId}`;
  const text = [
    `Revisamos los datos de pago del pedido ${shortId} y no pudimos confirmarlo.`,
    ``,
    `Motivo: ${input.reason}`,
    ``,
    `Si ya pagaste, revisa la referencia y el monto y vuelve a enviarnos los datos aquí:`,
    paymentUrl,
    ``,
    `Si tienes dudas, responde a este correo o escríbenos por WhatsApp.`,
  ].join("\n");

  const html = wrap(`
  <p style="font-size:16px;line-height:24px;margin:0 0 16px;">Revisamos los datos de pago del pedido <strong>${shortId}</strong> y no pudimos confirmarlo.</p>
  <p style="font-size:16px;line-height:24px;margin:0 0 24px;padding:12px 16px;border-left:3px solid #FF9E20;">${escapeHtml(input.reason)}</p>
  <p style="font-size:14px;line-height:22px;color:#4B6772;margin:0 0 16px;">Si ya pagaste, revisa la referencia y el monto y vuelve a enviarnos los datos.</p>
  <p style="margin:0 0 24px;"><a href="${paymentUrl}" style="display:inline-block;background:#135065;color:#F1ECE8;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px;">Enviar nuevos datos de pago</a></p>
  <p style="font-size:14px;line-height:22px;color:#4B6772;margin:0;">Si tienes dudas, responde a este correo o escríbenos por WhatsApp.</p>`);

  return { subject, html, text };
}
