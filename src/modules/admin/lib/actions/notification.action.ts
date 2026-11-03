"use server";

import { z } from "zod";

import { requireAdmin } from "../services/admin-access.service";
import { markNotificationsRead } from "../services/notification.service";

/** Marks one notification read, or all of them when `notificationId` is null. */
export async function markNotificationsReadAction(input: { notificationId: string | null }): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ notificationId: z.uuid().nullable() }).safeParse(input);
  if (!parsed.success) return;
  await markNotificationsRead(admin.id, parsed.data.notificationId);
}
