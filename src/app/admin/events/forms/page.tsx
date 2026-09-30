import type { Metadata } from "next";

import { AdminEventFormsScreen } from "@/modules/admin/screens/admin-event-forms-screen";

export const metadata: Metadata = {
  title: "Formularios",
};

export default async function Page(props: PageProps<"/admin/events/forms">) {
  const { event } = await props.searchParams;
  return <AdminEventFormsScreen eventId={typeof event === "string" ? event : undefined} />;
}
