import { Suspense } from "react"

import { AddUserForm } from "../components/users/add-user-form"
import { UserSearch } from "../components/users/user-search"
import { UsersTable } from "../components/users/users-table"
import { userSearchSchema } from "../lib/schemas/admin.schema"
import { listUsers } from "../lib/services/user.service"

export async function AdminUsersScreen({ query }: { query?: string }) {
  const parsed = userSearchSchema.safeParse(query)
  const q = parsed.success ? parsed.data : undefined
  const users = await listUsers(q)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Personas</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Todas las personas que han entrado con su correo, o que agregaste antes de que entren.
          Desde su ficha puedes darles acceso especial a sus fotos, por ejemplo a coordinadores o
          profesores, y ver sus pedidos y mensajes.
        </p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Suspense>
          <UserSearch />
        </Suspense>
        <AddUserForm />
      </div>
      <UsersTable users={users} query={q} />
    </div>
  )
}
