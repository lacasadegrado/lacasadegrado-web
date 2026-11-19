import type { Metadata } from "next";

import { PlanReceiptScreen } from "@/modules/plans/screens/plan-receipt-screen";

export const metadata: Metadata = {
  title: "Recibo de pago",
};

export default async function Page(props: PageProps<"/dashboard/payments/[planId]/receipt">) {
  const { planId } = await props.params;
  return <PlanReceiptScreen planId={planId} />;
}
