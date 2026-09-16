"use client";

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
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { formatEur } from "@/common/lib/utils/money.util";

import { approvePaymentAction, rejectPaymentAction } from "../../lib/actions/payment-review.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

const REJECTION_SUGGESTIONS = [
  "No encontramos un pago con esa referencia.",
  "El monto recibido no coincide con el del pedido.",
  "La captura no es legible. Envíala de nuevo.",
];

type ReviewActionsProps = {
  orderId: string;
  customerEmail: string;
  totalCents: number;
  reference: string;
};

/**
 * Approve is irreversible (it grants downloads), so both decisions sit
 * behind a confirm dialog. After a decision the card is removed by the
 * server revalidation; the result message stays until then.
 */
export function ReviewActions({ orderId, customerEmail, totalCents, reference }: ReviewActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [approveState, approveAction, approving] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await approvePaymentAction(previous, formData);
      setApproveOpen(false);
      return result;
    },
    IDLE,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await rejectPaymentAction(previous, formData);
      if (result.status === "success") setRejectOpen(false);
      return result;
    },
    IDLE,
  );

  const feedback = [approveState, rejectState].find((s) => s.status !== "idle");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={approving || rejecting}>
              Aprobar pago
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={approveAction}>
              <input type="hidden" name="orderId" value={orderId} />
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmas que recibiste {formatEur(totalCents)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Referencia {reference}. Al aprobar, {customerEmail} podrá descargar sus fotos de
                  inmediato y recibirá un correo. Esto no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel type="button" disabled={approving}>
                  Cancelar
                </AlertDialogCancel>
                <Button type="submit" disabled={approving}>
                  {approving ? "Aprobando…" : "Sí, aprobar"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={approving || rejecting}>
              Rechazar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={rejectAction} className="space-y-4">
              <input type="hidden" name="orderId" value={orderId} />
              <AlertDialogHeader>
                <AlertDialogTitle>Rechazar el pago de {customerEmail}</AlertDialogTitle>
                <AlertDialogDescription>
                  La persona recibirá este motivo por correo y podrá enviar nuevos datos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor={`reason-${orderId}`}>Motivo</Label>
                <Textarea
                  id={`reason-${orderId}`}
                  name="reason"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={300}
                  aria-invalid={rejectState.status === "error" || undefined}
                />
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="font-normal"
                      onClick={() => {
                        const field = document.getElementById(
                          `reason-${orderId}`,
                        ) as HTMLTextAreaElement | null;
                        if (field) field.value = suggestion;
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
                {rejectState.status === "error" ? (
                  <p role="alert" className="text-sm font-medium">
                    {rejectState.message}
                  </p>
                ) : null}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={rejecting}>
                  Cancelar
                </AlertDialogCancel>
                <Button type="submit" variant="outline" disabled={rejecting}>
                  {rejecting ? "Rechazando…" : "Rechazar y avisar"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {feedback && !rejectOpen ? (
        <Alert role={feedback.status === "error" ? "alert" : "status"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
