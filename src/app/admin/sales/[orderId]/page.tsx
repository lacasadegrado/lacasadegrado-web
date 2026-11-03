import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminSaleDetailScreen } from "@/modules/admin/screens/admin-sale-detail-screen";

export const metadata: Metadata = {
  title: "Venta",
};

export default async function Page(props: PageProps<"/admin/sales/[orderId]">) {
  const { orderId } = await props.params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  return <AdminSaleDetailScreen orderId={orderId} />;
}
