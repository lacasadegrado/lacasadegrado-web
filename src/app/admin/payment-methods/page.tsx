import type { Metadata } from "next";

import { AdminPaymentMethodsScreen } from "@/modules/admin/screens/admin-payment-methods-screen";

export const metadata: Metadata = {
  title: "Métodos de pago",
};

export default function Page() {
  return <AdminPaymentMethodsScreen />;
}
