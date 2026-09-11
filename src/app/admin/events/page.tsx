import type { Metadata } from "next";

import { AdminEventsScreen } from "@/modules/admin/screens/admin-events-screen";

export const metadata: Metadata = {
  title: "Eventos",
};

export default function Page() {
  return <AdminEventsScreen />;
}
