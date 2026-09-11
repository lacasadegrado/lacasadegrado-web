import type { Metadata } from "next";

import { CartScreen } from "@/modules/cart/screens/cart-screen";

export const metadata: Metadata = {
  title: "Carrito",
};

export default function Page() {
  return <CartScreen />;
}
