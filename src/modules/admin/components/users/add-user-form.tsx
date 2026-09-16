"use client"

import { UserPlus } from "lucide-react"
import Link from "next/link"
import { useActionState, useState } from "react"

import { Alert, AlertDescription } from "@/common/components/ui/alert"
import { Button } from "@/common/components/ui/button"
import { Checkbox } from "@/common/components/ui/checkbox"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

import { createUserAction } from "../../lib/actions/user.action"
import { ADMIN_PATHS } from "../../lib/constants/admin.constants"
import type { ActionState } from "../../lib/types/admin.types"

const IDLE: ActionState = { status: "idle" }

/**
 * Pre-creates a person with their access flags so a coordinator or
 * teacher sees (or downloads) their photos from their very first login.
 * On success the action redirects to the new person's page.
 */
export function AddUserForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(createUserAction, IDLE)
  const existingId = state.status === "error" ? state.fieldErrors?.existingProfileId : undefined

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden="true" /> Agregar persona
      </Button>
    )
  }

  return (
    <form action={action} className="space-y-5 rounded-md border p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold">Agregar persona</h2>
        <p className="text-sm text-muted-foreground">
          Crea su cuenta ahora y deja listos sus permisos. Cuando entre con este correo verá sus
          fotos etiquetadas de inmediato. No se le envía ningún correo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-email">Correo</Label>
        <Input
          id="new-user-email"
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="nombre@correo.com"
          aria-invalid={Boolean(state.status === "error" && state.fieldErrors?.email) || undefined}
          className="h-11 max-w-md text-base"
        />
        <p className="text-sm text-muted-foreground">
          El mismo correo con el que etiquetas sus fotos y con el que entrará.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-role">Rol o cargo (solo para ustedes)</Label>
        <Input
          id="new-user-role"
          name="roleLabel"
          placeholder="Coordinadora, Director, Profesor…"
          maxLength={60}
          className="max-w-md"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Acceso especial a sus fotos</legend>
        <label className="flex items-start gap-3 rounded-md border p-3" htmlFor="new-user-freeView">
          <Checkbox id="new-user-freeView" name="freeView" className="mt-0.5" />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Ver sin marca de agua</span>
            <span className="text-sm text-muted-foreground">
              Ve limpias las fotos donde está etiquetada, sin comprar. No verá carrito ni compras.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border p-3" htmlFor="new-user-freeDownload">
          <Checkbox id="new-user-freeDownload" name="freeDownload" className="mt-0.5" defaultChecked />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Descargar gratis</span>
            <span className="text-sm text-muted-foreground">
              Además de verlas, descarga los originales de sus fotos, una a una o en .zip.
            </span>
          </span>
        </label>
      </fieldset>

      {state.status === "error" ? (
        <Alert role="alert">
          <AlertDescription>
            {state.message}
            {existingId ? (
              <>
                {" "}
                <Link href={ADMIN_PATHS.user(existingId)} className="font-medium underline underline-offset-4">
                  Abrir su ficha
                </Link>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear persona"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
