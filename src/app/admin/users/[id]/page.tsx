import type { Metadata } from "next"

import { AdminUserDetailScreen } from "@/modules/admin/screens/admin-user-detail-screen"

export const metadata: Metadata = {
  title: "Persona",
}

export default async function Page(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params
  return <AdminUserDetailScreen profileId={id} />
}
