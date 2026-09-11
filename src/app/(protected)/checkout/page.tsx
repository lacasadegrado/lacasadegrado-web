import type { Metadata } from "next";

import { CheckoutScreen } from "@/modules/checkout/screens/checkout-screen";

export const metadata: Metadata = {
  title: "Pagar",
};

export default function Page() {
  return <CheckoutScreen />;
}
