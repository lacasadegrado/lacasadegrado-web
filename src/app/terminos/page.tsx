import type { Metadata } from "next";

import { TermsScreen } from "@/modules/legal/screens/terms-screen";

export const metadata: Metadata = {
  title: "Términos y condiciones",
};

export default function Page() {
  return <TermsScreen />;
}
