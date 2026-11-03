import type { Metadata } from "next";

import { packagePlanFiltersSchema } from "@/modules/admin/lib/schemas/package-plan.schema";
import { AdminPackagePlansScreen } from "@/modules/admin/screens/admin-package-plans-screen";

export const metadata: Metadata = {
  title: "Abonos",
};

export default async function Page(props: PageProps<"/admin/payments/plans">) {
  const params = packagePlanFiltersSchema.parse(await props.searchParams);
  return <AdminPackagePlansScreen params={params} />;
}
