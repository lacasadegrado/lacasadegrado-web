import type { Metadata } from "next";

import { PlanPayScreen } from "@/modules/plans/screens/plan-pay-screen";

export const metadata: Metadata = {
  title: "Pagar mi paquete",
};

export default async function Page(props: PageProps<"/dashboard/payments/[planId]/pay">) {
  const { planId } = await props.params;
  const { paso, cuotas, metodo } = await props.searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return <PlanPayScreen planId={planId} query={{ paso: one(paso), cuotas: one(cuotas), metodo: one(metodo) }} />;
}
