import Link from "next/link"

import { Badge } from "@/common/components/ui/badge"
import { Button } from "@/common/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table"
import { formatDateTime } from "@/common/lib/utils/date.util"

import { ADMIN_PATHS } from "../../lib/constants/admin.constants"
import type { AdminUserRow } from "../../lib/types/user.types"

export function AccessBadges({
  user,
}: {
  user: Pick<AdminUserRow, "isAdmin" | "freeView" | "freeDownload">
}) {
  if (!user.isAdmin && !user.freeView && !user.freeDownload) {
    return <span className="text-sm text-muted-foreground">Cliente</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {user.isAdmin ? <Badge>Admin</Badge> : null}
      {user.freeDownload ? (
        <Badge variant="secondary">Descarga gratis</Badge>
      ) : user.freeView ? (
        <Badge variant="secondary">Ve sin marca</Badge>
      ) : null}
    </span>
  )
}

export function UsersTable({ users, query }: { users: AdminUserRow[]; query?: string }) {
  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {query
          ? `Nadie coincide con «${query}».`
          : "Todavía nadie ha iniciado sesión. Las personas aparecen aquí la primera vez que entran."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead>Acceso</TableHead>
            <TableHead className="text-right">Fotos</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Mensajes</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium">{user.fullName ?? user.email}</div>
                {user.fullName ? (
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                ) : null}
                {user.roleLabel ? (
                  <div className="text-xs text-muted-foreground">{user.roleLabel}</div>
                ) : null}
              </TableCell>
              <TableCell>
                <AccessBadges user={user} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{user.taggedPhotos}</TableCell>
              <TableCell className="text-right tabular-nums">{user.orders}</TableCell>
              <TableCell className="text-right tabular-nums">{user.messages}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(user.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={ADMIN_PATHS.user(user.id)}>Ver</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
