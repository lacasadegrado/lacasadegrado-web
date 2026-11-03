"use client";

import { useActionState, useId, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
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
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { formatEur } from "@/common/lib/utils/money.util";

import { confirmPackagePaymentAction, rejectPackagePaymentAction } from "../../lib/actions/package-review.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

const REJECTION_SUGGESTIONS = [
  "No encontramos un pago con esa referencia.",
  "El monto recibido no coincide con el reportado.",
  "La captura no es legible. Envíala de nuevo.",
];

type PackageReviewActionsProps = {
  submissionId: string;
  /** Who paid, for the dialogs. */
  who: string;
  amountCents: number;
  reference: string | null;
  size?: "sm" | "default";
};

/**
 * Confirm counts the money toward the plan (and may complete it); reject
 * frees the parts and emails the reason with a new link. Both behind a
 * dialog, since the person is emailed either way.
 */
export function PackageReviewActions({ submissionId, who, amountCents, reference, size = "default" }: PackageReviewActionsProps) {
  const id = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const [confirmState, confirmAction, confirming] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await confirmPackagePaymentAction(previous, formData);
      setConfirmOpen(false);
      return result;
    },
    IDLE,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await rejectPackagePaymentAction(previous, formData);
      if (result.status === "success") setRejectOpen(false);
      return result;
    },
    IDLE,
  );
  const feedback = [confirmState, rejectState].find((state) => state.status !== "idle");
  const busy = confirming || rejecting;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" size={size} disabled={busy}>
              Confirmar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={confirmAction}>
              <input type="hidden" name="submissionId" value={submissionId} />
              <AlertDialogHeader>
                <AlertDialogTitle>¿Recibiste {formatEur(amountCents)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {reference ? `Referencia ${reference}. ` : ""}Se suma a lo pagado por {who} y le avisamos por
                  correo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel type="button" disabled={confirming}>
                  Cancelar
                </AlertDialogCancel>
                <Button type="submit" disabled={confirming}>
                  {confirming ? "Confirmando…" : "Sí, confirmar"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" size={size} variant="outline" disabled={busy}>
              Rechazar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={rejectAction} className="space-y-4">
              <input type="hidden" name="submissionId" value={submissionId} />
              <AlertDialogHeader>
                <AlertDialogTitle>Rechazar el pago de {who}</AlertDialogTitle>
                <AlertDialogDescription>
                  Recibirá este motivo por correo con un enlace nuevo para reportarlo otra vez.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor={`${id}-reason`}>Motivo</Label>
                <Textarea
                  id={`${id}-reason`}
                  name="reason"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
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
                      onClick={() => setReason(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
                {rejectState.status === "error" ? (
                  <p role="alert" className="text-sm font-medium">
                    {rejectState.status === "error" && rejectState.fieldErrors?.reason
                      ? rejectState.fieldErrors.reason
                      : rejectState.message}
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
