import type { Metadata } from "next";

import { packagePaymentFiltersSchema } from "@/modules/admin/lib/schemas/package-payment.schema";
import { AdminFormResponsesScreen } from "@/modules/admin/screens/admin-form-responses-screen";

export const metadata: Metadata = {
  title: "Respuestas del formulario",
};

export default async function Page(props: PageProps<"/admin/events/forms/[formId]/responses">) {
  const [{ formId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const params = packagePaymentFiltersSchema.parse(searchParams);
  return <AdminFormResponsesScreen formId={formId} params={params} />;
}
