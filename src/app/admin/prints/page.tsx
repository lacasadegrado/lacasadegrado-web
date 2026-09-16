import type { Metadata } from "next";

import { AdminPrintsScreen } from "@/modules/admin/screens/admin-prints-screen";

export const metadata: Metadata = {
  title: "Impresiones",
};

export default function Page() {
  return <AdminPrintsScreen />;
}
