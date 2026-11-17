import type { Metadata } from "next";

import { PlanDetailScreen } from "@/modules/plans/screens/plan-detail-screen";

export const metadata: Metadata = {
  title: "Mi paquete",
};

export default async function Page(props: PageProps<"/dashboard/payments/[planId]">) {
  const { planId } = await props.params;
  const { enviado } = await props.searchParams;
  return <PlanDetailScreen planId={planId} sent={enviado === "1"} />;
}
