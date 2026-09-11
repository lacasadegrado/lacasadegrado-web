/**
 * One branded frame for every transactional email. Table-based, inline
 * styles, no SVG, no external CSS: the things email clients respect.
 * Fira Sans is requested first and falls back to system sans faces.
 */

export const EMAIL_COLORS = {
  teal: "#135065",
  tealInk: "#0F2F3A",
  cream: "#F1ECE8",
  card: "#FBF8F5",
  amber: "#FF9E20",
  muted: "#4B6772",
  border: "#D6CCC3",
} as const;

const FONT = "'Fira Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Body copy paragraph. */
export function emailParagraph(html: string, options: { muted?: boolean } = {}): string {
  const color = options.muted ? EMAIL_COLORS.muted : EMAIL_COLORS.tealInk;
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:25px;color:${color};">${html}</p>`;
}

/** Teal button with cream text. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:${EMAIL_COLORS.teal};">
  <a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:${EMAIL_COLORS.cream};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

/** Label / value rows, e.g. reference and amount. */
export function emailDetails(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      (row) => `<tr>
    <td style="padding:8px 16px 8px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${EMAIL_COLORS.muted};white-space:nowrap;vertical-align:top;">${escapeHtml(row.label)}</td>
    <td style="padding:8px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${EMAIL_COLORS.tealInk};font-weight:600;">${row.value}</td>
  </tr>`,
    )
    .join("");
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-top:1px solid ${EMAIL_COLORS.border};border-bottom:1px solid ${EMAIL_COLORS.border};width:100%;">${cells}</table>`;
}

/** Quoted block with the amber rule, for reasons and messages. */
export function emailQuote(text: string): string {
  return `<p style="margin:0 0 20px;padding:12px 16px;border-left:4px solid ${EMAIL_COLORS.amber};background:${EMAIL_COLORS.cream};font-family:${FONT};font-size:16px;line-height:25px;color:${EMAIL_COLORS.tealInk};white-space:pre-wrap;">${escapeHtml(text)}</p>`;
}

/** Big code or amount, e.g. an OTP. */
export function emailDisplay(text: string): string {
  return `<p style="margin:0 0 20px;font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;letter-spacing:0.2em;color:${EMAIL_COLORS.teal};">${escapeHtml(text)}</p>`;
}

type LayoutInput = {
  /** Shown in inbox previews after the subject; keep under 90 chars. */
  preheader: string;
  /** Title inside the card, sentence case. */
  title: string;
  bodyHtml: string;
  appUrl: string;
  /** Small closing line under the card. */
  footerNote?: string;
};

export function renderEmailLayout(input: LayoutInput): string {
  const logo = `${input.appUrl}/brand/logo-cream.png`;
  const footer = input.footerNote ?? "Recibes este correo porque tienes una cuenta en La Casa de Grado.";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.cream};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${EMAIL_COLORS.cream};">${escapeHtml(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${EMAIL_COLORS.cream};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;">
      <tr><td style="background:${EMAIL_COLORS.teal};border-radius:16px 16px 0 0;padding:24px 32px;">
        <a href="${input.appUrl}" style="text-decoration:none;"><img src="${logo}" width="200" height="62" alt="La Casa de Grado" style="display:block;width:200px;height:auto;border:0;"></a>
      </td></tr>
      <tr><td style="background:${EMAIL_COLORS.card};border-radius:0 0 16px 16px;padding:32px;">
        <h1 style="margin:0 0 20px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${EMAIL_COLORS.teal};">${escapeHtml(input.title)}</h1>
        ${input.bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 8px 0;">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(footer)}</p>
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};"><a href="${input.appUrl}" style="color:${EMAIL_COLORS.teal};">${input.appUrl.replace(/^https?:\/\//, "")}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
