"use client"

import { useActionState, useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog"
import { Button } from "@/common/components/ui/button"

import { deleteEventAction } from "../lib/actions/event.action"
import type { ActionState, AdminEvent } from "../lib/types/admin.types"
import { Trash2 } from "lucide-react"

const IDLE: ActionState = { status: "idle" }

export function DeleteEventButton({ event }: { event: AdminEvent }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await deleteEventAction(previous, formData)
      if (result.status === "success") setOpen(false)
      return result
    },
    IDLE,
  )
  const blocked = event.photoCount > 0

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={blocked}
          title={
            blocked
              ? "Tiene fotos. Bórralas primero o desactiva el evento."
              : "Eliminar evento"
          }
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action}>
          <input type="hidden" name="eventId" value={event.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{event.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento no tiene fotos, así que no afecta a nadie. Esto no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {state.status === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium">
              {state.message}
            </p>
          ) : null}
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel type="button" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
