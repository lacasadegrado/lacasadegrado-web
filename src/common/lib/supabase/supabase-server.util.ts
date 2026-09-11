import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/common/lib/config/env.config";

/**
 * Supabase client for Server Components, Server Actions and Route
 * Handlers. Auth only: data access goes through Drizzle. Sessions live in
 * cookies; writes to them succeed in actions and handlers and are silently
 * skipped in Server Components, where the proxy has already refreshed them.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component. Cookies cannot be written
            // there; the proxy keeps the session fresh on every request.
          }
        },
      },
    },
  );
}
