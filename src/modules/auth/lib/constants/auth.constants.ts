export const AUTH_PATHS = {
  login: "/login",
  afterLogin: "/dashboard",
  afterLogout: "/",
} as const;

/** Query param carrying the path to return to after login. */
export const NEXT_PARAM = "next";

/** Path prefixes that require a session. `/admin` additionally requires `is_admin`. */
export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/cart",
  "/checkout",
  "/purchases",
  "/orders",
  "/admin",
] as const;

export const OTP_LENGTH = 6;

/**
 * Must match Auth > Providers > Email > "Email OTP expiration" in the
 * Supabase dashboard. Used only to tell "wrong code" from "expired code"
 * in the UI; Supabase enforces the real expiry.
 */
export const OTP_TTL_SECONDS = 10 * 60;

export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Our own limits (security rule 8), enforced before Supabase is called. */
export const OTP_RATE_LIMITS = {
  requestsPerEmail: { max: 5, windowSeconds: 15 * 60 },
  requestsPerIp: { max: 20, windowSeconds: 60 * 60 },
  verifyFailuresPerCode: { max: 5 },
} as const;

/** Attempt rows older than this are pruned. */
export const OTP_ATTEMPT_RETENTION_SECONDS = 24 * 60 * 60;

export const AUTH_MESSAGES = {
  invalid_email: "Escribe un correo válido, por ejemplo nombre@correo.com.",
  cooldown: (seconds: number) =>
    `Espera ${seconds} segundos antes de pedir otro código.`,
  rate_limited: (minutes: number) =>
    `Pediste demasiados códigos. Intenta de nuevo en ${minutes} minutos.`,
  send_failed:
    "No pudimos enviar el código. Revisa el correo e intenta de nuevo en un momento.",
  invalid_code: "El código debe tener 6 dígitos.",
  code_wrong: "El código no es correcto. Revisa tu correo e intenta de nuevo.",
  code_expired: "El código venció. Pide uno nuevo para continuar.",
  too_many_attempts:
    "Demasiados intentos con este código. Pide uno nuevo para continuar.",
  verify_failed:
    "No pudimos verificar el código. Intenta de nuevo en un momento.",
} as const;
