import type { Metadata } from "next";

import { salesFiltersSchema } from "@/modules/admin/lib/schemas/sale.schema";
import { AdminSalesScreen } from "@/modules/admin/screens/admin-sales-screen";

export const metadata: Metadata = {
  title: "Ventas",
};

export default async function Page(props: PageProps<"/admin/sales">) {
  const params = salesFiltersSchema.parse(await props.searchParams);
  return <AdminSalesScreen params={params} />;
}
