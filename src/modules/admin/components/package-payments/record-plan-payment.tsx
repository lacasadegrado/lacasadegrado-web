"use client";

import { useActionState, useId, useState } from "react";

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
import { InstallmentPicker } from "@/modules/forms/components/installment-picker/installment-picker";

import { recordPackagePaymentAction } from "../../lib/actions/package-review.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

type RecordPlanPaymentProps = {
  planId: string;
  who: string;
  priceCents: number;
  installments: number;
  /** Parts confirmed or under review; what is registered starts after them. */
  reserved: number;
};

/**
 * "Registrar pago" for money received outside the app (cash, WhatsApp):
 * confirmed at once, counted toward the plan and emailed to the person.
 */
export function RecordPlanPayment({ planId, who, priceCents, installments, reserved }: RecordPlanPaymentProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await recordPackagePaymentAction(previous, formData);
    if (result.status === "success") {
      setOpen(false);
      setCount(1);
    }
    return result;
  }, IDLE);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            Registrar pago
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <form action={action} className="space-y-5">
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="installments" value={count} />
            <DialogHeader>
              <DialogTitle className="leading-snug">Registrar un pago de {who}</DialogTitle>
              <DialogDescription>
                Para pagos que recibiste fuera de la página (efectivo, WhatsApp). Queda confirmado de una vez y le
                avisamos por correo.
              </DialogDescription>
            </DialogHeader>
            <InstallmentPicker
              id={`${id}-installments`}
              priceCents={priceCents}
              installments={installments}
              reserved={reserved}
              value={count}
              onChange={setCount}
              eurToVes={null}
              error={fieldErrors?.installments}
            />
            <div className="space-y-2">
              <Label htmlFor={`${id}-reference`}>Referencia (opcional)</Label>
              <Input id={`${id}-reference`} name="reference" maxLength={60} aria-invalid={Boolean(fieldErrors?.reference) || undefined} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-note`}>Nota (opcional)</Label>
              <Textarea
                id={`${id}-note`}
                name="note"
                rows={2}
                maxLength={300}
                placeholder="Por ejemplo: efectivo, recibido por Kiara"
                aria-invalid={Boolean(fieldErrors?.note) || undefined}
              />
            </div>
            {state.status === "error" ? (
              <Alert role="alert">
                <AlertDescription>{Object.values(fieldErrors ?? {})[0] ?? state.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando…" : "Registrar y avisar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {state.status === "success" && !open ? (
        <Alert role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
