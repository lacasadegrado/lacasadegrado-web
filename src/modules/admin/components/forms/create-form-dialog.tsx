"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

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
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import { FORM_KIND_DESCRIPTIONS, FORM_KIND_LABELS } from "@/modules/forms/lib/constants/forms.constants";

import { createFormAction } from "../../lib/actions/form.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

/** Asks for the kind and a title; on success the action redirects to the builder. */
export function CreateFormDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createFormAction, IDLE);
  const error = state.status === "error" ? state.message : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus aria-hidden="true" /> Crear formulario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo formulario</DialogTitle>
          <DialogDescription>
            Empieza como borrador con los campos básicos de su tipo. Luego puedes agregar o cambiar
            lo que quieras. El tipo no se puede cambiar después.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="eventId" value={eventId} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo de formulario</legend>
            <RadioGroup name="kind" defaultValue="package_payment" className="gap-3">
              {(["package_payment", "general"] as const).map((kind) => (
                <div key={kind} className="flex items-start gap-2">
                  <RadioGroupItem id={`new-form-kind-${kind}`} value={kind} className="mt-0.5" />
                  <Label htmlFor={`new-form-kind-${kind}`} className="block font-normal">
                    <span className="font-medium">{FORM_KIND_LABELS[kind]}</span>
                    <span className="block text-sm text-muted-foreground">{FORM_KIND_DESCRIPTIONS[kind]}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="new-form-title">Título</Label>
            <Input
              id="new-form-title"
              name="title"
              placeholder="Reporta el pago de tu paquete"
              required
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "new-form-title-error" : undefined}
            />
            {error ? (
              <p id="new-form-title-error" role="alert" className="text-sm font-medium">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear y editar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
