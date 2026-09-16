"use client";

import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";

import { markPrintsDeliveredAction } from "../../lib/actions/print.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

type MarkDeliveredButtonProps = {
  orderId: string;
  institution: string;
  printCount: number;
};

/** Irreversible: it dates the hand-off and emails the customer, so it asks first. */
export function MarkDeliveredButton({ orderId, institution, printCount }: MarkDeliveredButtonProps) {
  const [state, action, pending] = useActionState(markPrintsDeliveredAction, IDLE);
  const prints = printCount === 1 ? "la foto impresa" : `las ${printCount} fotos impresas`;

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Marcar entregada a la institución"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Entregaste {prints} en {institution}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se registra la fecha de hoy, la persona recibe un correo y desde hoy corren los días
              de responsabilidad. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <form action={action}>
              <input type="hidden" name="orderId" value={orderId} />
              <AlertDialogAction type="submit">Sí, entregada</AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
