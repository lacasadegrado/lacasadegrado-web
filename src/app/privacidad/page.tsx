import type { Metadata } from "next";

import { PrivacyScreen } from "@/modules/legal/screens/privacy-screen";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

export default function Page() {
  return <PrivacyScreen />;
}
