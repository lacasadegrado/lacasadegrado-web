import type { Metadata } from "next";

import { GalleryScreen } from "@/modules/gallery/screens/gallery-screen";

export const metadata: Metadata = {
  title: "Mis fotos",
};

export default function Page() {
  return <GalleryScreen />;
}
