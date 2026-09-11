export const SUPPORT_MESSAGES = {
  /** Prefilled WhatsApp text. Keep it short; the person will edit it. */
  noPhotos: (email: string) =>
    `Hola, entré a La Casa de Grado con el correo ${email} y no veo mis fotos. ¿Me pueden ayudar?`,
  /** From the public landing page, before login. */
  public: "Hola, tengo una pregunta sobre mis fotos de grado.",
  general: (email: string) =>
    `Hola, escribo desde La Casa de Grado con el correo ${email}. Necesito ayuda con:`,
  order: (email: string, orderId: string) =>
    `Hola, escribo desde La Casa de Grado con el correo ${email} sobre mi pedido ${orderId.slice(0, 8).toUpperCase()}. Necesito ayuda con:`,
} as const;

/** Per profile, to keep a stuck form from flooding the inbox. */
export const SUPPORT_LIMITS = {
  maxMessagesPerHour: 5,
} as const;

/** Routes where an order id in the URL is worth attaching to the contact. */
export const ORDER_ID_ROUTE_PATTERNS = [
  /^\/orders\/([0-9a-f-]{36})/i,
  /^\/checkout\/([0-9a-f-]{36})\/payment/i,
] as const;
