import {
  emailDetails,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatEur } from "@/common/lib/utils/money.util";

type FormSubmittedEmailInput = {
  formTitle: string;
  eventName: string;
  packageName: string;
  priceCents: number;
  reference: string;
  appUrl: string;
};

/**
 * Receipt for the person who filled a package form. It promises nothing
 * about verification timing: the business checks these by hand.
 */
export function buildFormSubmittedEmail(input: FormSubmittedEmailInput) {
  const price = formatEur(input.priceCents);
  const subject = `Recibimos tu comprobante: ${input.packageName}`;

  const text = [
    `Recibimos tu respuesta al formulario "${input.formTitle}" de ${input.eventName}.`,
    ``,
    `Paquete: ${input.packageName} (${price})`,
    `Referencia: ${input.reference}`,
    ``,
    `Vamos a verificar tu pago. Si falta algún dato te escribimos a este correo.`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `${input.packageName}, referencia ${input.reference}.`,
    title: "Recibimos tu comprobante",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Gracias. Registramos tu respuesta al formulario <strong>${escapeHtml(input.formTitle)}</strong> de ${escapeHtml(input.eventName)}.`,
      ) +
      emailDetails([
        { label: "Paquete", value: `${escapeHtml(input.packageName)} <span style="font-weight:400;">(${price})</span>` },
        { label: "Referencia", value: escapeHtml(input.reference) },
      ]) +
      emailParagraph("Vamos a verificar tu pago. Si falta algún dato te escribimos a este correo.", {
        muted: true,
      }),
  });

  return { subject, html, text };
}
