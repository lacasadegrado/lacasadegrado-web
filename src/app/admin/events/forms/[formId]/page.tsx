import type { Metadata } from "next";

import { AdminFormBuilderScreen } from "@/modules/admin/screens/admin-form-builder-screen";

export const metadata: Metadata = {
  title: "Editar formulario",
};

export default async function Page(props: PageProps<"/admin/events/forms/[formId]">) {
  const { formId } = await props.params;
  return <AdminFormBuilderScreen formId={formId} />;
}
