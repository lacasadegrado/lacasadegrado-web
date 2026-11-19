import { Suspense } from "react"

import { AddUserForm } from "../components/users/add-user-form"
import { ImportPeopleDialog } from "../components/users/import-people-dialog"
import { UserSearch } from "../components/users/user-search"
import { UsersTable } from "../components/users/users-table"
import { userSearchSchema } from "../lib/schemas/admin.schema"
import { listEventsWithPackages } from "../lib/services/people-import.service"
import { listUsers } from "../lib/services/user.service"

export async function AdminUsersScreen({ query }: { query?: string }) {
  const parsed = userSearchSchema.safeParse(query)
  const q = parsed.success ? parsed.data : undefined
  const users = await listUsers(q)
  const events = await listEventsWithPackages()

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
        <div className="flex flex-wrap items-start gap-2">
          <ImportPeopleDialog events={events} />
          <AddUserForm />
        </div>
      </div>
      <UsersTable users={users} query={q} />
    </div>
  )
}
