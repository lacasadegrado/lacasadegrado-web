import type { Metadata } from "next";

import { AdminPaymentsScreen } from "@/modules/admin/screens/admin-payments-screen";

export const metadata: Metadata = {
  title: "Pagos",
};

export default function Page() {
  return <AdminPaymentsScreen />;
}
