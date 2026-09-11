type SupportNotificationInput = {
  name: string;
  email: string;
  phone?: string;
  orderId?: string;
  message: string;
  appUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const html = `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#135065;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:18px;font-weight:700;margin:0 0 16px;">Nuevo mensaje de soporte</p>
  <table style="border-collapse:collapse;font-size:14px;line-height:22px;margin:0 0 16px;">
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Nombre</td><td>${escapeHtml(input.name)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Correo</td><td>${escapeHtml(input.email)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Teléfono</td><td>${escapeHtml(input.phone ?? "no indicado")}</td></tr>
    ${shortOrder ? `<tr><td style="padding:2px 16px 2px 0;color:#4B6772;">Pedido</td><td>${shortOrder}</td></tr>` : ""}
  </table>
  <p style="font-size:15px;line-height:23px;white-space:pre-wrap;margin:0 0 16px;padding:12px 16px;border-left:3px solid #FF9E20;">${escapeHtml(input.message)}</p>
  <p style="font-size:13px;color:#4B6772;margin:0;">Responde a este correo para contestarle directamente.</p>
</div>`;

  return { subject, html, text: lines.join("\n") };
}
