import {
  emailButton,
  emailDetails,
  emailParagraph,
  emailQuote,
  escapeHtml,
  renderEmailLayout,
} from "@/common/lib/email/email-layout.util";

type SupportNotificationInput = {
  name: string;
  email: string;
  phone?: string;
  orderId?: string;
  message: string;
  appUrl: string;
};

/** Internal notification to the business. Reply-to is the customer. */
export function buildSupportNotificationEmail(input: SupportNotificationInput) {
  const shortOrder = input.orderId ? input.orderId.slice(0, 8).toUpperCase() : null;
  const subject = shortOrder
    ? `Soporte: ${input.name} sobre el pedido ${shortOrder}`
    : `Soporte: mensaje de ${input.name}`;

  const lines = [
    `Nombre: ${input.name}`,
    `Correo: ${input.email}`,
    `Teléfono: ${input.phone ?? "no indicado"}`,
    shortOrder ? `Pedido: ${shortOrder} (${input.appUrl}/admin/payments)` : null,
    ``,
    input.message,
    ``,
    `Responde a este correo para contestarle directamente.`,
  ].filter((line): line is string => line !== null);

  const rows = [
    { label: "Nombre", value: escapeHtml(input.name) },
    { label: "Correo", value: `<a href="mailto:${escapeHtml(input.email)}" style="color:#135065;">${escapeHtml(input.email)}</a>` },
    { label: "Teléfono", value: escapeHtml(input.phone ?? "no indicado") },
  ];
  if (shortOrder) rows.push({ label: "Pedido", value: shortOrder });

  const html = renderEmailLayout({
    preheader: input.message.slice(0, 90),
    title: "Nuevo mensaje de soporte",
    appUrl: input.appUrl,
    footerNote: "Notificación interna del formulario de ayuda.",
    bodyHtml:
      emailDetails(rows) +
      emailQuote(input.message) +
      (shortOrder ? emailButton(`${input.appUrl}/admin/payments`, "Abrir la cola de pagos") : "") +
      emailParagraph("Responde a este correo para contestarle directamente.", { muted: true }),
  });

  return { subject, html, text: lines.join("\n") };
}
