import type { Metadata } from "next";

import { AdminPackagePaymentDetailScreen } from "@/modules/admin/screens/admin-package-payment-detail-screen";

export const metadata: Metadata = {
  title: "Respuesta",
};

export default async function Page(props: PageProps<"/admin/events/forms/[formId]/responses/[submissionId]">) {
  const { formId, submissionId } = await props.params;
  return <AdminPackagePaymentDetailScreen formId={formId} submissionId={submissionId} />;
}
