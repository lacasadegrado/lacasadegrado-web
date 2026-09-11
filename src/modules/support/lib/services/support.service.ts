import "server-only";

import { and, count, eq, gt } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { supportMessages, type SupportChannel } from "@/common/lib/db/schema";
import type { SessionUser } from "@/modules/auth/lib/types/auth.types";

import { SUPPORT_LIMITS } from "../constants/support.constants";

type NewContact = {
  channel: SupportChannel;
  name: string;
  phone?: string;
  message: string;
};

/** Both paths land here so nothing is lost (brief 5.6). */
export async function createSupportMessage(
  viewer: SessionUser,
  contact: NewContact,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(supportMessages)
    .values({
      profileId: viewer.id,
      name: contact.name,
      email: viewer.email,
      phone: contact.phone ?? null,
      message: contact.message,
      channel: contact.channel,
      status: "new",
    })
    .returning({ id: supportMessages.id });
  return row;
}

export async function isOverMessageLimit(viewer: SessionUser): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ total: count() })
    .from(supportMessages)
    .where(
      and(
        eq(supportMessages.profileId, viewer.id),
        eq(supportMessages.channel, "form"),
        gt(supportMessages.createdAt, since),
      ),
    );
  return (row?.total ?? 0) >= SUPPORT_LIMITS.maxMessagesPerHour;
}
