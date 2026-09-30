import type { Metadata } from "next";

import { AdminPackagePaymentDetailScreen } from "@/modules/admin/screens/admin-package-payment-detail-screen";

export const metadata: Metadata = {
  title: "Respuesta de paquete",
};

export default async function Page(props: PageProps<"/admin/payments/packages/[id]">) {
  const { id } = await props.params;
  return <AdminPackagePaymentDetailScreen submissionId={id} />;
}
