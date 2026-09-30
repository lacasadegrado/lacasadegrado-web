"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";

import { createPackageAction, updatePackageAction } from "../../lib/actions/package.action";
import type { ActionState } from "../../lib/types/admin.types";
import type { AdminPackage } from "../../lib/types/form-admin.types";

const IDLE: ActionState = { status: "idle" };

type PackageDialogProps =
  | { mode: "create"; eventId: string; pkg?: never }
  | { mode: "edit"; pkg: AdminPackage; eventId?: never };

/** Create or edit a package; the form resets each time the dialog opens. */
export function PackageDialog(props: PackageDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result =
        props.mode === "create"
          ? await createPackageAction(previous, formData)
          : await updatePackageAction(previous, formData);
      if (result.status === "success") setOpen(false);
      return result;
    },
    IDLE,
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const prefix = props.mode === "edit" ? `package-${props.pkg.id}` : "package-new";
  const pkg = props.pkg;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((key) => key + 1);
      }}
    >
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button type="button" size="sm">
            <Plus aria-hidden="true" /> Agregar paquete
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${props.pkg.name}`}>
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Nuevo paquete" : "Editar paquete"}</DialogTitle>
          <DialogDescription>
            {props.mode === "create"
              ? "Aparece en la lista de paquetes de todos los formularios de este evento."
              : "Las respuestas ya enviadas conservan el nombre y el precio que tenían."}
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={action} className="space-y-4" noValidate>
          {props.mode === "create" ? (
            <input type="hidden" name="eventId" value={props.eventId} />
          ) : (
            <input type="hidden" name="packageId" value={props.pkg.id} />
          )}

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-name`}>Nombre</Label>
            <Input
              id={`${prefix}-name`}
              name="name"
              defaultValue={pkg?.name}
              placeholder="Paquete Oro"
              required
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
            />
            {errors.name ? (
              <p id={`${prefix}-name-error`} className="text-sm font-medium">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-description`}>Qué incluye (opcional)</Label>
            <Textarea
              id={`${prefix}-description`}
              name="description"
              rows={3}
              defaultValue={pkg?.description ?? ""}
              placeholder="10 fotos digitales y 2 impresas de 20×30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-price`}>Precio (EUR)</Label>
            <Input
              id={`${prefix}-price`}
              name="priceEur"
              inputMode="decimal"
              defaultValue={pkg ? (pkg.priceCents / 100).toFixed(2) : ""}
              placeholder="40.00"
              className="max-w-40 tabular-nums"
              required
              aria-invalid={Boolean(errors.priceEur) || undefined}
              aria-describedby={errors.priceEur ? `${prefix}-price-error` : undefined}
            />
            {errors.priceEur ? (
              <p id={`${prefix}-price-error`} className="text-sm font-medium">
                {errors.priceEur}
              </p>
            ) : null}
          </div>

          {state.status === "error" && !state.fieldErrors ? (
            <Alert role="alert">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : props.mode === "create" ? "Crear paquete" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
