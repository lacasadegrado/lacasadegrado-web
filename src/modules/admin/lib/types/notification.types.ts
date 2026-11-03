import type { NotificationKind } from "@/common/lib/db/schema";

export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string;
  createdAt: Date;
  readAt: Date | null;
};

/** What GET /api/admin/notifications returns (dates as ISO strings). */
export type NotificationsResponse = {
  items: (Omit<AdminNotification, "createdAt" | "readAt"> & { createdAt: string; readAt: string | null })[];
  unread: number;
};
