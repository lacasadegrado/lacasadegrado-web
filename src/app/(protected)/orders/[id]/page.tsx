import type { Metadata } from "next";

import { OrderScreen } from "@/modules/orders/screens/order-screen";

export const metadata: Metadata = {
  title: "Pedido",
};

export default async function Page(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  return <OrderScreen orderId={id} />;
}
