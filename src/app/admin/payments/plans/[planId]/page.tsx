import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPackagePlanDetailScreen } from "@/modules/admin/screens/admin-package-plan-detail-screen";

export const metadata: Metadata = {
  title: "Plan de pagos",
};

export default async function Page(props: PageProps<"/admin/payments/plans/[planId]">) {
  const { planId } = await props.params;
  if (!z.uuid().safeParse(planId).success) notFound();
  return <AdminPackagePlanDetailScreen planId={planId} />;
}
