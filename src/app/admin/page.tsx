import type { Metadata } from "next";
import { z } from "zod";

import { DASHBOARD_RANGES } from "@/modules/admin/lib/constants/dashboard.constants";
import { AdminDashboardScreen } from "@/modules/admin/screens/admin-dashboard-screen";

export const metadata: Metadata = {
  title: "Resumen",
};

const searchSchema = z.object({
  range: z.enum(DASHBOARD_RANGES.map((option) => option.value) as [string, ...string[]]).catch("30d"),
  event: z.uuid().optional().catch(undefined),
});

export default async function Page(props: PageProps<"/admin">) {
  const params = searchSchema.parse(await props.searchParams);
  return (
    <AdminDashboardScreen
      range={params.range as (typeof DASHBOARD_RANGES)[number]["value"]}
      eventId={params.event}
    />
  );
}
