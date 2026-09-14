"use client"

import { useActionState } from "react"

import { Alert, AlertDescription } from "@/common/components/ui/alert"
import { Button } from "@/common/components/ui/button"
import { Checkbox } from "@/common/components/ui/checkbox"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

import { updateUserPermissionsAction } from "../../lib/actions/user.action"
import type { ActionState } from "../../lib/types/admin.types"
import type { AdminUserDetail } from "../../lib/types/user.types"

const IDLE: ActionState = { status: "idle" }

type UserPermissionsFormProps = {
  profile: AdminUserDetail["profile"]
  /** The signed-in admin; used to prevent removing one's own admin flag. */
  isSelf: boolean
}

export function UserPermissionsForm({ profile, isSelf }: UserPermissionsFormProps) {
  const [state, action, pending] = useActionState(updateUserPermissionsAction, IDLE)

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="profileId" value={profile.id} />

      <div className="space-y-2">
        <Label htmlFor="roleLabel">Rol o cargo (solo para ustedes)</Label>
        <Input
          id="roleLabel"
          name="roleLabel"
          defaultValue={profile.roleLabel ?? ""}
          placeholder="Coordinadora, Director, Profesor…"
          maxLength={60}
        />
        <p className="text-sm text-muted-foreground">
          La persona no lo ve. Sirve para reconocerla en la lista.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Acceso especial a sus fotos</legend>
        <label className="flex items-start gap-3 rounded-md border p-3" htmlFor="freeView">
          <Checkbox id="freeView" name="freeView" defaultChecked={profile.freeView} className="mt-0.5" />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Ver sin marca de agua</span>
            <span className="text-sm text-muted-foreground">
              Ve limpias las fotos donde está etiquetada, sin comprar. No verá carrito ni compras.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border p-3" htmlFor="freeDownload">
          <Checkbox
            id="freeDownload"
            name="freeDownload"
            defaultChecked={profile.freeDownload}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Descargar gratis</span>
            <span className="text-sm text-muted-foreground">
              Además de verlas, descarga los originales de sus fotos, una a una o en .zip. Cada
              descarga queda registrada.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Administración</legend>
        <label className="flex items-start gap-3 rounded-md border p-3" htmlFor="isAdmin">
          <Checkbox
            id="isAdmin"
            name="isAdmin"
            defaultChecked={profile.isAdmin}
            disabled={isSelf}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Administrador</span>
            <span className="text-sm text-muted-foreground">
              {isSelf
                ? "No puedes quitarte este acceso a ti mismo."
                : "Entra a este panel y puede subir fotos, aprobar pagos y cambiar permisos."}
            </span>
          </span>
        </label>
        {isSelf ? <input type="hidden" name="isAdmin" value="on" /> : null}
      </fieldset>

      {state.status !== "idle" ? (
        <Alert role={state.status === "error" ? "alert" : "status"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar permisos"}
      </Button>
    </form>
  )
}
