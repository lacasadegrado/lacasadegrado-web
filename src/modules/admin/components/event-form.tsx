"use client"

import { useActionState, useState } from "react"

import { Alert, AlertDescription } from "@/common/components/ui/alert"
import { Button } from "@/common/components/ui/button"
import { Checkbox } from "@/common/components/ui/checkbox"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

import { createEventAction } from "../lib/actions/event.action"
import type { ActionState } from "../lib/types/admin.types"
import { eventSlug } from "../lib/utils/slug.util"

const IDLE: ActionState = { status: "idle" }

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm font-medium">
      {message}
    </p>
  )
}

export function EventForm() {
  const [formKey, setFormKey] = useState(0)
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await createEventAction(previous, formData)
      if (result.status === "success") setFormKey((key) => key + 1)
      return result
    },
    IDLE,
  )

  return (
    <div className="space-y-4">
      {state.status === "success" ? (
        <Alert role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <EventFields
        key={formKey}
        state={state}
        action={action}
        pending={pending}
      />
    </div>
  )
}

type EventFieldsProps = {
  state: ActionState
  action: (formData: FormData) => void
  pending: boolean
}

function EventFields({ state, action, pending }: EventFieldsProps) {
  const [name, setName] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {}
  const effectiveSlug = slugTouched ? slug : eventSlug(name, eventDate)

  return (
    <form
      action={action}
      className="space-y-5 rounded-md border p-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="event-name">Nombre del evento</Label>
        <Input
          id="event-name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acto de grado Ingeniería"
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby={errors.name ? "event-name-error" : undefined}
        />
        <FieldError id="event-name-error" message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-institution">Institución</Label>
        <Input
          id="event-institution"
          name="institution"
          required
          placeholder="Universidad Católica Andrés Bello"
          aria-invalid={Boolean(errors.institution) || undefined}
          aria-describedby={
            errors.institution ? "event-institution-error" : undefined
          }
        />
        <FieldError id="event-institution-error" message={errors.institution} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-date">Fecha</Label>
        <Input
          id="event-date"
          name="eventDate"
          type="date"
          required
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          aria-invalid={Boolean(errors.eventDate) || undefined}
          aria-describedby={errors.eventDate ? "event-date-error" : undefined}
        />
        <FieldError id="event-date-error" message={errors.eventDate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-slug">Identificador</Label>
        <Input
          id="event-slug"
          name="slug"
          value={effectiveSlug}
          onChange={(event) => {
            setSlugTouched(true)
            setSlug(event.target.value)
          }}
          spellCheck={false}
          autoCapitalize="off"
          className="font-mono text-sm"
          aria-invalid={Boolean(errors.slug) || undefined}
          aria-describedby={
            errors.slug ? "event-slug-error" : "event-slug-hint"
          }
        />
        {errors.slug ? (
          <FieldError id="event-slug-error" message={errors.slug} />
        ) : (
          <p id="event-slug-hint" className="text-sm text-muted-foreground">
            Se genera solo. Solo letras minúsculas, números y guiones.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="event-active" name="isActive" defaultChecked />
        <Label htmlFor="event-active">
          Activo (visible para los estudiantes)
        </Label>
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <Alert role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear evento"}
      </Button>
    </form>
  )
}
