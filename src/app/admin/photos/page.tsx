import type { Metadata } from "next";

import { AdminPhotosScreen } from "@/modules/admin/screens/admin-photos-screen";

export const metadata: Metadata = {
  title: "Fotos",
};

export default async function Page(props: PageProps<"/admin/photos">) {
  const { event, carpeta, buscar } = await props.searchParams;
  return (
    <AdminPhotosScreen
      eventId={typeof event === "string" ? event : undefined}
      folder={typeof carpeta === "string" ? carpeta : undefined}
      search={typeof buscar === "string" ? buscar : undefined}
    />
  );
}
