import { notificationsHandler } from "@/modules/admin/lib/handlers/notifications.handler";

export async function GET() {
  return notificationsHandler();
}
