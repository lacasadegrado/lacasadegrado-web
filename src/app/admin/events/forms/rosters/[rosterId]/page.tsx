import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminRosterScreen } from "@/modules/admin/screens/admin-roster-screen";

export const metadata: Metadata = {
  title: "Listado de personas",
};

export default async function Page(props: PageProps<"/admin/events/forms/rosters/[rosterId]">) {
  const { rosterId } = await props.params;
  if (!z.uuid().safeParse(rosterId).success) notFound();
  return <AdminRosterScreen rosterId={rosterId} />;
}
