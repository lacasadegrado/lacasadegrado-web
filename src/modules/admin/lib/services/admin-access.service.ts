import "server-only";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/common/lib/db";
import { profiles } from "@/common/lib/db/schema";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";
import { buildLoginUrl } from "@/modules/auth/lib/utils/auth.util";

import { ADMIN_PATHS } from "../constants/admin.constants";

/** Plain lookup, safe to call from the proxy. */
export async function isAdminUser(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.isAdmin ?? false;
}

const isAdminCached = cache(isAdminUser);

/** Null unless the request carries a session for an admin profile. */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return (await isAdminCached(user.id)) ? user : null;
}

/**
 * For layouts, pages and actions. Anonymous users go to login; signed-in
 * non-admins get a 404 so the admin area's existence is not confirmed.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(buildLoginUrl(ADMIN_PATHS.root));
  if (!(await isAdminCached(user.id))) notFound();
  return user;
}
