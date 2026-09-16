export const LEGAL_PATHS = {
  terms: "/terminos",
  privacy: "/privacidad",
} as const;

/**
 * Bump when the terms change in substance. It is stamped on every order
 * at creation (`orders.terms_version`), so the business can tell which
 * text a person agreed to.
 */
export const TERMS_VERSION = "2026-09-15";

/** Shown at the top of both legal pages. YYYY-MM-DD. */
export const LEGAL_UPDATED_ON = "2026-09-15";
