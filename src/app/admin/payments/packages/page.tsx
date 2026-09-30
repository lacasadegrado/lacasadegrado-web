import type { Metadata } from "next";

import { packagePaymentFiltersSchema } from "@/modules/admin/lib/schemas/package-payment.schema";
import { AdminPackagePaymentsScreen } from "@/modules/admin/screens/admin-package-payments-screen";

export const metadata: Metadata = {
  title: "Pagos de paquetes",
};

export default async function Page(props: PageProps<"/admin/payments/packages">) {
  const params = packagePaymentFiltersSchema.parse(await props.searchParams);
  return <AdminPackagePaymentsScreen params={params} />;
}
