import {
  AUTH_PATHS,
  NEXT_PARAM,
  PROTECTED_PATH_PREFIXES,
} from "../constants/auth.constants";

export function isProtectedPath(
  pathname: string,
  prefixes: readonly string[] = PROTECTED_PATH_PREFIXES,
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Only ever redirect to a same-origin path. Rejects absolute URLs,
 * protocol-relative URLs and the login page itself.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string = AUTH_PATHS.afterLogin,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next === AUTH_PATHS.login || next.startsWith(`${AUTH_PATHS.login}?`)) {
    return fallback;
  }
  return next;
}

/** Relative login URL, carrying `next` only when it is a safe path. */
export function buildLoginUrl(next?: string | null): string {
  const safe = sanitizeNextPath(next, "");
  if (!safe) return AUTH_PATHS.login;
  return `${AUTH_PATHS.login}?${NEXT_PARAM}=${encodeURIComponent(safe)}`;
}

/** Best-effort client IP behind a reverse proxy. Null when unknown. */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}
