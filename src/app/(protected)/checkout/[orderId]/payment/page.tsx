import type { Metadata } from "next";

import { PaymentScreen } from "@/modules/checkout/screens/payment-screen";

export const metadata: Metadata = {
  title: "Datos de pago",
};

export default async function Page(props: PageProps<"/checkout/[orderId]/payment">) {
  const { orderId } = await props.params;
  return <PaymentScreen orderId={orderId} />;
}
