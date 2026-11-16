import type { Metadata } from "next";

import { AdminPaymentFormScreen } from "@/modules/admin/screens/admin-payment-form-screen";

export const metadata: Metadata = {
  title: "Formulario de pagos",
};

export default function Page() {
  return <AdminPaymentFormScreen />;
}
