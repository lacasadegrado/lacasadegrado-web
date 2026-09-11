import "server-only";

import { db } from "@/common/lib/db";
import { profiles } from "@/common/lib/db/schema";

import type { SessionUser } from "../types/auth.types";

/**
 * Guarantees a `profiles` row for an authenticated user. Runs on every
 * successful OTP verification; idempotent.
 */
export async function upsertProfileForUser(user: SessionUser): Promise<void> {
  await db
    .insert(profiles)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email: user.email },
    });
}
