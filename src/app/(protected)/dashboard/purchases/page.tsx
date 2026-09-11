import type { Metadata } from "next";

import { PurchasesScreen } from "@/modules/purchases/screens/purchases-screen";

export const metadata: Metadata = {
  title: "Mis compras",
};

export default function Page() {
  return <PurchasesScreen />;
}
