"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";

import { deletePhotoAction } from "../../lib/actions/photo.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

type DeletePhotoButtonProps = {
  photoId: string;
  filename: string;
};

export function DeletePhotoButton({ photoId, filename }: DeletePhotoButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await deletePhotoAction(previous, formData);
      if (result.status === "success") setOpen(false);
      return result;
    },
    IDLE,
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar ${filename}`} title="Eliminar foto">
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action}>
          <input type="hidden" name="photoId" value={photoId} />
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {filename}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el original y sus vistas previas del almacenamiento, y desaparece de la galería
              de las personas etiquetadas. No se puede deshacer. Si la foto ya está en un pedido, no
              se permitirá borrarla.
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
  );
}
