import {
  emailButton,
  emailDetails,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";

import type { PlanReceipt, SubmitReceipt } from "../types/public-form.types";

type FormSubmittedEmailInput = {
  formTitle: string;
  eventName: string;
  receipt: SubmitReceipt;
  appUrl: string;
};

type Row = { label: string; value: string; text: string };

function plainRow(label: string, text: string): Row {
  return { label, value: escapeHtml(text), text };
}

/** Amount, parts and balance of a plan payment, for every email that reports one. */
function planRows(plan: PlanReceipt): Row[] {
  const amount = `${formatEur(plan.amountCents)}${plan.eurToVes ? ` (${formatVes(plan.amountCents, plan.eurToVes)})` : ""}`;
  const parts =
    plan.installments > 1 ? `${plan.installmentsCovered} de ${plan.installments} cuota${plan.installments === 1 ? "" : "s"}` : null;
  const remaining = Math.max(0, plan.priceCents - plan.confirmedCents - plan.pendingCents);
  return [
    plainRow("Este pago", parts ? `${amount} · ${parts}` : amount),
    plainRow("Confirmado hasta hoy", `${formatEur(plan.confirmedCents)} de ${formatEur(plan.priceCents)}`),
    ...(remaining > 0 ? [plainRow("Falta por pagar", formatEur(remaining))] : []),
  ];
}

/**
 * Receipt for the person who filled a form. A package payment lists the
 * package, the amount of this payment and the plan's balance, plus the
 * private link for the next abonos. Verification is by hand, so no
 * timing is promised. A general form only confirms receipt.
 */
export function buildFormSubmittedEmail(input: FormSubmittedEmailInput) {
  const { receipt } = input;
  const isPayment = receipt.kind === "package_payment";
  const title = isPayment ? "Recibimos tu comprobante" : "Recibimos tu respuesta";
  const subject = isPayment && receipt.packageName
    ? `Recibimos tu comprobante: ${receipt.packageName}`
    : `${title}: ${input.formTitle}`;

  const rows: Row[] = [];
  if (receipt.packageName) {
    const price = receipt.priceCents !== null ? formatEur(receipt.priceCents) : null;
    rows.push({
      label: "Paquete",
      value: `${escapeHtml(receipt.packageName)}${price ? ` <span style="font-weight:400;">(${price})</span>` : ""}`,
      text: `${receipt.packageName}${price ? ` (${price})` : ""}`,
    });
  }
  if (receipt.plan) rows.push(...planRows(receipt.plan));
  if (receipt.reference) rows.push(plainRow("Referencia", receipt.reference));
  const closing = isPayment
    ? "Vamos a verificar tu pago. Si falta algún dato te escribimos a este correo."
    : "Si falta algún dato te escribimos a este correo.";
  const planNote = receipt.plan
    ? "Guarda este enlace: con él haces tus próximos abonos sin volver a llenar tus datos y ves cuánto llevas pagado."
    : null;

  const text = [
    `Recibimos tu respuesta al formulario "${input.formTitle}" de ${input.eventName}.`,
    ...(rows.length > 0 ? ["", ...rows.map((row) => `${row.label}: ${row.text}`)] : []),
    ...(receipt.plan && planNote ? ["", planNote, receipt.plan.url] : []),
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
      (receipt.plan && planNote
        ? emailParagraph(planNote) + emailButton(receipt.plan.url, "Ver mi plan de pagos")
        : "") +
      emailParagraph(closing, { muted: true }),
  });

  return { subject, html, text };
}

/** "Send me my link again": one email with every open plan of that address in the event. */
export function buildPlanLinksEmail(input: {
  eventName: string;
  plans: { packageName: string; url: string }[];
  appUrl: string;
}) {
  const subject = `Tu enlace para abonar: ${input.eventName}`;
  const intro = `Este es tu enlace para seguir pagando tu paquete de ${input.eventName}. Los enlaces anteriores dejan de funcionar.`;
  const text = [intro, "", ...input.plans.map((plan) => `${plan.packageName}: ${plan.url}`)].join("\n");
  const html = renderEmailLayout({
    preheader: intro,
    title: "Tu enlace para abonar",
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(escapeHtml(intro)) +
      input.plans
        .map(
          (plan) =>
            emailParagraph(`<strong>${escapeHtml(plan.packageName)}</strong>`) + emailButton(plan.url, "Abrir mi plan de pagos"),
        )
        .join("") +
      emailParagraph("Si no lo pediste tú, puedes ignorar este correo.", { muted: true }),
  });
  return { subject, html, text };
}

/** After an admin reviews a package payment: confirmed (maybe fully paid) or rejected. */
export function buildPackagePaymentReviewedEmail(input: {
  outcome: "confirmed" | "paid" | "rejected";
  eventName: string;
  packageName: string;
  amountCents: number;
  confirmedCents: number;
  priceCents: number;
  reason: string | null;
  /** Fresh plan link, only on rejection (the person has to report again). */
  planUrl: string | null;
  formUrl: string;
  appUrl: string;
}) {
  const remaining = Math.max(0, input.priceCents - input.confirmedCents);
  const titles = {
    confirmed: "Confirmamos tu abono",
    paid: "Tu paquete está pagado",
    rejected: "No pudimos confirmar tu pago",
  } as const;
  const title = titles[input.outcome];
  const rows: Row[] = [
    plainRow("Paquete", input.packageName),
    plainRow("Pago revisado", formatEur(input.amountCents)),
    plainRow("Pagado hasta hoy", `${formatEur(input.confirmedCents)} de ${formatEur(input.priceCents)}`),
    ...(remaining > 0 && input.outcome !== "paid" ? [plainRow("Falta por pagar", formatEur(remaining))] : []),
  ];
  const lead =
    input.outcome === "paid"
      ? `¡Listo! Completaste el pago de tu paquete de ${input.eventName}. No tienes que hacer nada más.`
      : input.outcome === "confirmed"
        ? `Confirmamos tu abono para tu paquete de ${input.eventName}.`
        : `Revisamos el pago que reportaste para tu paquete de ${input.eventName} y no pudimos confirmarlo.`;
  const next =
    input.outcome === "rejected"
      ? "Revisa los datos y vuelve a reportarlo con el enlace de abajo. El enlace anterior ya no funciona."
      : input.outcome === "confirmed"
        ? `Para tu próximo abono usa el enlace de tu primer correo. Si lo perdiste, pide uno nuevo en ${input.formUrl}.`
        : null;

  const text = [
    lead,
    ...(input.reason ? ["", `Motivo: ${input.reason}`] : []),
    "",
    ...rows.map((row) => `${row.label}: ${row.text}`),
    ...(next ? ["", next] : []),
    ...(input.planUrl ? [input.planUrl] : []),
  ].join("\n");
  const html = renderEmailLayout({
    preheader: lead,
    title,
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(escapeHtml(lead)) +
      (input.reason ? emailParagraph(`<strong>Motivo:</strong> ${escapeHtml(input.reason)}`) : "") +
      emailDetails(rows.map(({ label, value }) => ({ label, value }))) +
      (next ? emailParagraph(escapeHtml(next)) : "") +
      (input.planUrl ? emailButton(input.planUrl, "Reportar el pago de nuevo") : ""),
  });
  return { subject: `${title}: ${input.packageName}`, html, text };
}
