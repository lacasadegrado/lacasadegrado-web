import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { notifications, profiles, type NotificationKind } from "@/common/lib/db/schema";

import { NOTIFICATIONS } from "../constants/notification.constants";
import type { AdminNotification } from "../types/notification.types";

/**
 * One row per admin, so each reads and clears their own. Never throws:
 * a notification failing must not fail the payment that triggered it.
 */
export async function notifyAdmins(input: {
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href: string;
}): Promise<void> {
  try {
    const admins = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.isAdmin, true));
    if (admins.length === 0) return;
    await db.insert(notifications).values(
      admins.map((admin) => ({
        profileId: admin.id,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href,
      })),
    );
  } catch (error) {
    console.error("[notifications] could not notify admins", {
      kind: input.kind,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The latest notifications of one admin, newest first, with the unread count. */
export async function listNotifications(
  profileId: string,
): Promise<{ items: AdminNotification[]; unread: number }> {
  const [items, [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(eq(notifications.profileId, profileId))
      .orderBy(desc(notifications.createdAt))
      .limit(NOTIFICATIONS.listLimit),
    db
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.profileId, profileId), isNull(notifications.readAt))),
  ]);
  return { items, unread: unread?.total ?? 0 };
}

/** Only the owner's own row; null id marks every unread one. */
export async function markNotificationsRead(profileId: string, notificationId: string | null): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.profileId, profileId),
        isNull(notifications.readAt),
        notificationId ? eq(notifications.id, notificationId) : undefined,
      ),
    );
}
