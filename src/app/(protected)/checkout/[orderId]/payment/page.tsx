import type { Metadata } from "next";

import { PAYMENT_STEP_PARAM } from "@/modules/checkout/lib/constants/checkout.constants";
import { PaymentScreen } from "@/modules/checkout/screens/payment-screen";

export const metadata: Metadata = {
  title: "Datos de pago",
};

export default async function Page(props: PageProps<"/checkout/[orderId]/payment">) {
  const [{ orderId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const raw = searchParams[PAYMENT_STEP_PARAM];
  return <PaymentScreen orderId={orderId} step={Array.isArray(raw) ? raw[0] : raw} />;
}
