import {
  emailButton,
  emailParagraph,
  emailQuote,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatEur } from "@/common/lib/utils/money.util";

type ApprovedInput = {
  orderId: string;
  totalCents: number;
  photoCount: number;
  /** Lines bought as prints; zero for digital-only orders. */
  printCount: number;
  /** Approximate days until prints reach the institution. */
  printDeliveryDays: number;
  appUrl: string;
};

/** "Your photos are ready." Sent once an admin verifies the payment. */
export function buildPaymentApprovedEmail(input: ApprovedInput) {
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  const purchasesUrl = `${input.appUrl}/dashboard/purchases`;
  const photos = `${input.photoCount} foto${input.photoCount === 1 ? "" : "s"}`;
  const prints =
    input.printCount > 0
      ? input.printCount === 1
        ? `Tu foto impresa llega a tu institución en unos ${input.printDeliveryDays} días; te avisamos por correo cuando la entreguemos.`
        : `Tus ${input.printCount} fotos impresas llegan a tu institución en unos ${input.printDeliveryDays} días; te avisamos por correo cuando las entreguemos.`
      : null;

  const subject = `Tus fotos están listas · pedido ${shortId}`;
  const text = [
    `Confirmamos tu pago del pedido ${shortId} (${formatEur(input.totalCents)}).`,
    ``,
    `Ya puedes descargar ${photos} en alta resolución, sin marca de agua:`,
    purchasesUrl,
    ...(prints ? [``, prints] : []),
    ``,
    `Gracias por confiar en La Casa de Grado.`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Pago confirmado. Ya puedes descargar ${photos} en alta resolución.`,
    title: "Tus fotos están listas",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Confirmamos tu pago del pedido <strong>${shortId}</strong> (${formatEur(input.totalCents)}).`,
      ) +
      emailParagraph(
        `Ya puedes descargar ${photos} en alta resolución, sin marca de agua. Quedan en tu cuenta, así que puedes volver por ellas cuando quieras.`,
      ) +
      emailButton(purchasesUrl, "Descargar mis fotos") +
      (prints ? emailParagraph(prints) : "") +
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

type PrintDeliveredInput = {
  orderId: string;
  printCount: number;
  institution: string;
  responsibilityDays: number;
  appUrl: string;
};

/** The prints were handed to the institution; the person collects them there. */
export function buildPrintDeliveredEmail(input: PrintDeliveredInput) {
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${input.appUrl}/orders/${input.orderId}`;
  const prints =
    input.printCount === 1 ? "tu foto impresa" : `tus ${input.printCount} fotos impresas`;

  const subject = `Tu foto impresa ya está en ${input.institution} · pedido ${shortId}`;
  const text = [
    `Entregamos ${prints} del pedido ${shortId} en ${input.institution}.`,
    ``,
    `Retírala allí; la institución se encarga de hacértela llegar.`,
    `Tienes ${input.responsibilityDays} días desde hoy para cualquier reclamo sobre la impresión. Pasado ese plazo, la responsabilidad es de la institución.`,
    ``,
    `Puedes ver el pedido aquí: ${orderUrl}`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Entregamos ${prints} en ${input.institution}.`,
    title: "Tu foto impresa ya está en tu institución",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Entregamos ${prints} del pedido <strong>${shortId}</strong> en <strong>${input.institution}</strong>. Retírala allí; la institución se encarga de hacértela llegar.`,
      ) +
      emailParagraph(
        `Tienes ${input.responsibilityDays} días desde hoy para cualquier reclamo sobre la impresión. Pasado ese plazo, la responsabilidad es de la institución.`,
        { muted: true },
      ) +
      emailButton(orderUrl, "Ver el pedido"),
  });

  return { subject, html, text };
}
