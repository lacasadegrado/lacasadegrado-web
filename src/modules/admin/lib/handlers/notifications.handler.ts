import "server-only";

import { NextResponse } from "next/server";

import { getAdminUser } from "../services/admin-access.service";
import { listNotifications } from "../services/notification.service";
import type { NotificationsResponse } from "../types/notification.types";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** GET /api/admin/notifications. The signed-in admin's own notifications only. */
export async function notificationsHandler(): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const { items, unread } = await listNotifications(admin.id);
  const body: NotificationsResponse = {
    unread,
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
    })),
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
