import type { Metadata } from "next";

import { AdminRatesScreen } from "@/modules/admin/screens/admin-rates-screen";

export const metadata: Metadata = {
  title: "Tasa de cambio",
};

export default function Page() {
  return <AdminRatesScreen />;
}
