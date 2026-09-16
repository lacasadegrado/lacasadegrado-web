import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/common/lib/config/env.config";

const globalForSupabase = globalThis as unknown as { __lcgSupabaseAdmin?: SupabaseClient };

/**
 * Service-role client for Auth admin calls (creating a user before their
 * first login). Never import from a client component: the key bypasses
 * RLS. Data access still goes through Drizzle; this is for `auth.admin`.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!globalForSupabase.__lcgSupabaseAdmin) {
    const env = getServerEnv();
    globalForSupabase.__lcgSupabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return globalForSupabase.__lcgSupabaseAdmin;
}
