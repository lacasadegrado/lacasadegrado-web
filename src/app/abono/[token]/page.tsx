import type { Metadata } from "next";

import { PlanScreen } from "@/modules/forms/screens/plan-screen";

/** Private by link: never indexed, never sent as a referrer. */
export const metadata: Metadata = {
  title: "Tu plan de pagos",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page(props: PageProps<"/abono/[token]">) {
  const { token } = await props.params;
  return <PlanScreen token={token} />;
}
