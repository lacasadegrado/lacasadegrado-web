/**
 * Runs once when the Next.js server boots. Validating env here means a
 * misconfigured deployment dies immediately instead of on the first
 * request that happens to touch a missing variable.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/common/lib/config/env.config");
    getServerEnv();
  }
}
