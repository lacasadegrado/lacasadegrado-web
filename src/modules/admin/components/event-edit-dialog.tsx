"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { updateEventAction } from "../lib/actions/event.action";
import type { ActionState, AdminEvent } from "../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium">
      {message}
    </p>
  );
}

export function EventEditDialog({ event }: { event: AdminEvent }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await updateEventAction(previous, formData);
      if (result.status === "success") setOpen(false);
      return result;
    },
    IDLE,
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const prefix = `edit-${event.id}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>
            Los cambios se ven de inmediato en la galería y en la portada. Cambiar el identificador
            no afecta a las fotos ya subidas.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="eventId" value={event.id} />

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-name`}>Nombre del evento</Label>
            <Input
              id={`${prefix}-name`}
              name="name"
              defaultValue={event.name}
              required
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
            />
            <FieldError id={`${prefix}-name-error`} message={errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-institution`}>Institución</Label>
            <Input
              id={`${prefix}-institution`}
              name="institution"
              defaultValue={event.institution}
              required
              aria-invalid={Boolean(errors.institution) || undefined}
            />
            <FieldError id={`${prefix}-institution-error`} message={errors.institution} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-date`}>Fecha</Label>
              <Input
                id={`${prefix}-date`}
                name="eventDate"
                type="date"
                defaultValue={event.eventDate}
                required
                aria-invalid={Boolean(errors.eventDate) || undefined}
              />
              <FieldError id={`${prefix}-date-error`} message={errors.eventDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-slug`}>Identificador</Label>
              <Input
                id={`${prefix}-slug`}
                name="slug"
                defaultValue={event.slug}
                spellCheck={false}
                autoCapitalize="off"
                className="font-mono text-sm"
                aria-invalid={Boolean(errors.slug) || undefined}
              />
              <FieldError id={`${prefix}-slug-error`} message={errors.slug} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id={`${prefix}-active`} name="isActive" defaultChecked={event.isActive} />
            <Label htmlFor={`${prefix}-active`}>Activo (visible para los estudiantes)</Label>
          </div>

          {state.status === "error" && !state.fieldErrors ? (
            <Alert role="alert">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
