import type { Metadata } from "next";

import { PlansScreen } from "@/modules/plans/screens/plans-screen";

export const metadata: Metadata = {
  title: "Pagos",
};

export default function Page() {
  return <PlansScreen />;
}
