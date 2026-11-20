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
 * Receipt for the person who filled a form or paid an installment.
 * - Package sign-up (`receipt.signup`): the package and how to pay it
 *   from "Pagos". The login code arrives in its own email.
 * - Installment (`receipt.plan`): the amount, the plan's balance and a
 *   link to "Pagos". Verification is by hand, so no timing is promised.
 * - General form: only confirms receipt.
 */
export function buildFormSubmittedEmail(input: FormSubmittedEmailInput) {
  const { receipt } = input;
  const isPayment = receipt.kind === "package_payment" && receipt.plan !== null;
  const isSignup = receipt.signup !== null;
  const title = isSignup ? "Te inscribiste en tu paquete" : isPayment ? "Recibimos tu pago" : "Recibimos tu respuesta";
  const subject =
    (isSignup || isPayment) && receipt.packageName ? `${title}: ${receipt.packageName}` : `${title}: ${input.formTitle}`;

  const rows: Row[] = [];
  if (receipt.packageName) {
    const price = receipt.priceCents !== null ? formatEur(receipt.priceCents) : null;
    const parts = receipt.signup && receipt.signup.installments > 1 ? ` en ${receipt.signup.installments} cuotas` : "";
    rows.push({
      label: "Paquete",
      value: `${escapeHtml(receipt.packageName)}${price ? ` <span style="font-weight:400;">(${price}${parts})</span>` : ""}`,
      text: `${receipt.packageName}${price ? ` (${price}${parts})` : ""}`,
    });
  }
  if (receipt.plan) rows.push(...planRows(receipt.plan));
  if (receipt.reference) rows.push(plainRow("Referencia", receipt.reference));

  const lead = isSignup
    ? `Quedaste inscrito en el paquete de ${input.eventName}. Ahora puedes pagarlo desde Pagos, entrando con este correo.`
    : isPayment
      ? `Registramos tu pago del paquete de ${input.eventName}.`
      : `Gracias. Registramos tu respuesta al formulario "${input.formTitle}" de ${input.eventName}.`;
  const leadHtml = isSignup || isPayment
    ? escapeHtml(lead)
    : `Gracias. Registramos tu respuesta al formulario <strong>${escapeHtml(input.formTitle)}</strong> de ${escapeHtml(input.eventName)}.`;
  const link = receipt.signup?.url ?? receipt.plan?.url ?? null;
  const closing = isSignup
    ? "Para entrar te pedimos un código que llega a este correo. Las fotos del paquete se liberan cuando esté pagado completo."
    : isPayment
      ? "Vamos a verificar tu pago y te avisamos por correo. Si falta algún dato te escribimos aquí."
      : "Si falta algún dato te escribimos a este correo.";

  const text = [
    lead,
    ...(rows.length > 0 ? ["", ...rows.map((row) => `${row.label}: ${row.text}`)] : []),
    ...(link ? ["", `Pagos: ${link}`] : []),
    "",
    closing,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: rows.length > 0 ? rows.map((row) => row.text).join(", ") : `${input.formTitle} · ${input.eventName}`,
    title,
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(leadHtml) +
      (rows.length > 0 ? emailDetails(rows.map(({ label, value }) => ({ label, value }))) : "") +
      (link ? emailButton(link, isSignup ? "Ir a pagar mi paquete" : "Ver mis pagos") : "") +
      emailParagraph(closing, { muted: true }),
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
  /** "Pagos", where they see the plan and report again; the receipt when fully paid. */
  plansUrl: string;
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
      ? "Revisa los datos y vuelve a reportarlo desde Pagos, entrando con este correo."
      : input.outcome === "confirmed"
        ? "Tus próximas cuotas las pagas desde Pagos, entrando con este correo."
        : "Tu recibo de pago ya está listo: ábrelo con el botón de abajo para verlo o descargarlo.";
  const button =
    input.outcome === "rejected" ? "Reportar el pago de nuevo" : input.outcome === "paid" ? "Ver mi recibo" : "Ver mis pagos";

  const text = [
    lead,
    ...(input.reason ? ["", `Motivo: ${input.reason}`] : []),
    "",
    ...rows.map((row) => `${row.label}: ${row.text}`),
    ...(next ? ["", next] : []),
    "",
    input.plansUrl,
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
      emailButton(input.plansUrl, button),
  });
  return { subject: `${title}: ${input.packageName}`, html, text };
}

/** After an admin imports people from an Excel: their package is waiting in "Pagos". */
export function buildPlanEnrolledEmail(input: {
  personName: string | null;
  eventName: string;
  packageName: string;
  priceCents: number;
  installments: number;
  /** Already paid (imported payments); shown with what is left. */
  paidCents?: number;
  /** "Pagos", behind login with this email. */
  plansUrl: string;
  appUrl: string;
}) {
  const title = "Tu paquete está listo para pagar";
  const paidCents = input.paidCents ?? 0;
  const greeting = input.personName ? `Hola, ${input.personName}.` : "Hola.";
  const lead = `${greeting} Te inscribimos en el ${input.packageName} de ${input.eventName}.`;
  const price =
    input.installments > 1
      ? `${formatEur(input.priceCents)} en ${input.installments} cuotas`
      : formatEur(input.priceCents);
  const rows: Row[] = [
    plainRow("Paquete", input.packageName),
    plainRow("Precio", price),
    ...(paidCents > 0
      ? [
          plainRow("Ya pagaste", formatEur(paidCents)),
          plainRow("Te falta", formatEur(Math.max(0, input.priceCents - paidCents))),
        ]
      : []),
  ];
  const how =
    "Para pagar, entra con este correo: te enviamos un código para iniciar sesión y en «Pagos» tocas «Pagar».";

  const text = [lead, "", ...rows.map((row) => `${row.label}: ${row.text}`), "", how, "", input.plansUrl].join("\n");
  const html = renderEmailLayout({
    preheader: lead,
    title,
    appUrl: input.appUrl,
    bodyHtml:
      emailParagraph(escapeHtml(lead)) +
      emailDetails(rows.map(({ label, value }) => ({ label, value }))) +
      emailParagraph(escapeHtml(how)) +
      emailButton(input.plansUrl, "Ir a pagar mi paquete"),
  });
  return { subject: `${title}: ${input.packageName}`, html, text };
}
