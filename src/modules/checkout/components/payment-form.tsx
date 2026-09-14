"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { submitPaymentAction } from "../lib/actions/payment.action";
import { PROOF_UPLOAD } from "../lib/constants/checkout.constants";
import type { PaymentFormState } from "../lib/types/checkout.types";

const IDLE: PaymentFormState = { status: "idle" };

type PaymentFormProps = {
  orderId: string;
  isResubmission: boolean;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium">
      {message}
    </p>
  );
}

export function PaymentForm({ orderId, isResubmission }: PaymentFormProps) {
  const [state, action, pending] = useActionState(submitPaymentAction, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="reference">Número de referencia</Label>
        <Input
          id="reference"
          name="reference"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="Ej. 012345678901"
          aria-invalid={Boolean(errors.reference) || undefined}
          aria-describedby={errors.reference ? "reference-error" : "reference-hint"}
          className="h-11 text-base tabular-nums"
        />
        {errors.reference ? (
          <FieldError id="reference-error" message={errors.reference} />
        ) : (
          <p id="reference-hint" className="text-sm text-muted-foreground">
            Aparece en el comprobante de tu banco.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="payerName">Nombre de quien pagó</Label>
        <Input
          id="payerName"
          name="payerName"
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.payerName) || undefined}
          aria-describedby={errors.payerName ? "payerName-error" : undefined}
          className="h-11 text-base"
        />
        <FieldError id="payerName-error" message={errors.payerName} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payerPhone">Teléfono</Label>
          <Input
            id="payerPhone"
            name="payerPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="0412-1234567"
            aria-invalid={Boolean(errors.payerPhone) || undefined}
            aria-describedby={errors.payerPhone ? "payerPhone-error" : undefined}
            className="h-11 text-base"
          />
          <FieldError id="payerPhone-error" message={errors.payerPhone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payerBank">Banco desde el que pagaste</Label>
          <Input
            id="payerBank"
            name="payerBank"
            list="banks"
            required
            aria-invalid={Boolean(errors.payerBank) || undefined}
            aria-describedby={errors.payerBank ? "payerBank-error" : undefined}
            className="h-11 text-base"
          />
          <datalist id="banks">
            <option value="Banco de Venezuela" />
            <option value="Banesco" />
            <option value="Mercantil" />
            <option value="BBVA Provincial" />
            <option value="Bancamiga" />
            <option value="BNC" />
            <option value="Banco del Tesoro" />
            <option value="Bancaribe" />
          </datalist>
          <FieldError id="payerBank-error" message={errors.payerBank} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof">Captura del comprobante (opcional)</Label>
        <Input
          id="proof"
          name="proof"
          type="file"
          accept={PROOF_UPLOAD.accept}
          aria-invalid={Boolean(errors.proof) || undefined}
          aria-describedby={errors.proof ? "proof-error" : "proof-hint"}
          className="h-auto cursor-pointer py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background"
        />
        {errors.proof ? (
          <FieldError id="proof-error" message={errors.proof} />
        ) : (
          <p id="proof-hint" className="text-sm text-muted-foreground">
            Ayuda a verificar más rápido. JPG, PNG o WebP hasta{" "}
            {Math.round(PROOF_UPLOAD.maxBytes / 1024 / 1024)} MB.
          </p>
        )}
      </div>

      {state.status === "error" ? (
        <Alert role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending
          ? "Enviando…"
          : isResubmission
            ? "Enviar nuevos datos de pago"
            : "Enviar datos del pago"}
      </Button>
    </form>
  );
}
