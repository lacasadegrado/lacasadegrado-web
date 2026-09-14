import type { Metadata } from "next"

import { AdminUsersScreen } from "@/modules/admin/screens/admin-users-screen"

export const metadata: Metadata = {
  title: "Personas",
}

export default async function Page(props: PageProps<"/admin/users">) {
  const { q } = await props.searchParams
  return <AdminUsersScreen query={typeof q === "string" ? q : undefined} />
}
