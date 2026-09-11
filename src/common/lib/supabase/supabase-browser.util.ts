import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/common/lib/config/env.config";

/**
 * Browser Supabase client. Authentication only, never data. Exists for
 * client-side auth state listeners; the OTP flow itself runs through
 * Server Actions so our own rate limits apply.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
