import {
  emailButton,
  emailParagraph,
  emailQuote,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatUsd } from "@/common/lib/utils/money.util";

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

  const html = renderEmailLayout({
    preheader: `Pago confirmado. Ya puedes descargar ${photos} en alta resolución.`,
    title: "Tus fotos están listas",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Confirmamos tu pago del pedido <strong>${shortId}</strong> (${formatUsd(input.totalCents)}).`,
      ) +
      emailParagraph(
        `Ya puedes descargar ${photos} en alta resolución, sin marca de agua. Quedan en tu cuenta, así que puedes volver por ellas cuando quieras.`,
      ) +
      emailButton(purchasesUrl, "Descargar mis fotos") +
      emailParagraph("Gracias por confiar en La Casa de Grado.", { muted: true }),
  });

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

  const html = renderEmailLayout({
    preheader: `Motivo: ${input.reason}`,
    title: "No pudimos confirmar tu pago",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Revisamos los datos de pago del pedido <strong>${shortId}</strong> y no pudimos confirmarlo.`,
      ) +
      emailQuote(input.reason) +
      emailParagraph(
        "Si ya pagaste, revisa la referencia y el monto y vuelve a enviarnos los datos.",
      ) +
      emailButton(paymentUrl, "Enviar nuevos datos de pago") +
      emailParagraph("Si tienes dudas, responde a este correo o escríbenos por WhatsApp.", {
        muted: true,
      }),
  });

  return { subject, html, text };
}
