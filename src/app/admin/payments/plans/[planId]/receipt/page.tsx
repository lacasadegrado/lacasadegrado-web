import type { Metadata } from "next";

import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";
import { requireAdmin } from "@/modules/admin/lib/services/admin-access.service";
import { PlanReceiptScreen } from "@/modules/plans/screens/plan-receipt-screen";

export const metadata: Metadata = {
  title: "Recibo de pago",
};

export default async function Page(props: PageProps<"/admin/payments/plans/[planId]/receipt">) {
  // Any plan's receipt: checked here too, not only in the admin layout.
  await requireAdmin();
  const { planId } = await props.params;
  return (
    <PlanReceiptScreen
      planId={planId}
      admin={{ backHref: ADMIN_PATHS.packagePlan(planId), backLabel: "Plan de pagos" }}
    />
  );
}
