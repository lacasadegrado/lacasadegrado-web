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
import { formatDateOnly } from "@/common/lib/utils/date.util"

import { setEventActiveAction } from "../lib/actions/event.action"
import { ADMIN_PATHS } from "../lib/constants/admin.constants"
import type { AdminEvent } from "../lib/types/admin.types"
import { DeleteEventButton } from "./delete-event-button"
import { EventEditDialog } from "./event-edit-dialog"

export function EventsTable({ events }: { events: AdminEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Todavía no hay eventos. Crea el primero con el formulario.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Fotos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="font-medium">{event.name}</div>
                <div className="text-sm text-muted-foreground">
                  {event.institution}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {event.slug}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateOnly(event.eventDate)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {event.photoCount}
              </TableCell>
              <TableCell>
                <Badge variant={event.isActive ? "default" : "outline"}>
                  {event.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${ADMIN_PATHS.photos}?event=${event.id}`}>
                      Fotos
                    </Link>
                  </Button>
                  <form action={setEventActiveAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={event.isActive ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {event.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                  <EventEditDialog event={event} />
                  <DeleteEventButton event={event} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
