import {
  emailDetails,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatEur } from "@/common/lib/utils/money.util";

import type { SubmitReceipt } from "../types/public-form.types";

type FormSubmittedEmailInput = {
  formTitle: string;
  eventName: string;
  receipt: SubmitReceipt;
  appUrl: string;
};

/**
 * Receipt for the person who filled a form. A payment form lists the
 * package and reference it got (either may be empty when the admin made
 * it optional) and promises nothing about verification timing: the
 * business checks these by hand. A general form only confirms receipt.
 */
export function buildFormSubmittedEmail(input: FormSubmittedEmailInput) {
  const { receipt } = input;
  const isPayment = receipt.kind === "package_payment";
  const title = isPayment ? "Recibimos tu comprobante" : "Recibimos tu respuesta";
  const subject = isPayment && receipt.packageName
    ? `Recibimos tu comprobante: ${receipt.packageName}`
    : `${title}: ${input.formTitle}`;

  const rows: { label: string; value: string; text: string }[] = [];
  if (receipt.packageName) {
    const price = receipt.priceCents !== null ? formatEur(receipt.priceCents) : null;
    rows.push({
      label: "Paquete",
      value: `${escapeHtml(receipt.packageName)}${price ? ` <span style="font-weight:400;">(${price})</span>` : ""}`,
      text: `${receipt.packageName}${price ? ` (${price})` : ""}`,
    });
  }
  if (receipt.reference) {
    rows.push({ label: "Referencia", value: escapeHtml(receipt.reference), text: receipt.reference });
  }
  const closing = isPayment
    ? "Vamos a verificar tu pago. Si falta algún dato te escribimos a este correo."
    : "Si falta algún dato te escribimos a este correo.";

  const text = [
    `Recibimos tu respuesta al formulario "${input.formTitle}" de ${input.eventName}.`,
    ...(rows.length > 0 ? ["", ...rows.map((row) => `${row.label}: ${row.text}`)] : []),
    ``,
    closing,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: rows.length > 0 ? rows.map((row) => row.text).join(", ") : `${input.formTitle} · ${input.eventName}`,
    title,
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(
        `Gracias. Registramos tu respuesta al formulario <strong>${escapeHtml(input.formTitle)}</strong> de ${escapeHtml(input.eventName)}.`,
      ) +
      (rows.length > 0 ? emailDetails(rows.map(({ label, value }) => ({ label, value }))) : "") +
      emailParagraph(closing, { muted: true }),
  });

  return { subject, html, text };
}
