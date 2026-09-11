import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/common/lib/supabase/supabase-server.util";

import type { SessionUser } from "../types/auth.types";
import { buildLoginUrl } from "../utils/auth.util";

/**
 * The authenticated user for the current request. The JWT signature and
 * expiry are verified locally with the project's public keys, exactly as
 * the proxy does, so both layers always agree. A network call to the Auth
 * server here would let a transient outage bounce users between the
 * proxy and the layout forever. Memoized per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const { sub, email } = data.claims as { sub?: string; email?: string };
  if (!sub || !email) return null;
  return { id: sub, email: email.toLowerCase() };
});

/** Redirects to login when there is no session. Use in every protected surface. */
export async function requireSessionUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(buildLoginUrl(nextPath));
  return user;
}
