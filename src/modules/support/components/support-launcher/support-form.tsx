"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";

import { sendSupportMessageAction } from "../../lib/actions/support.action";
import type { SupportFormState } from "../../lib/types/support.types";

const IDLE: SupportFormState = { status: "idle" };

type SupportFormProps = {
  email: string;
  orderId?: string;
  onSent?: () => void;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium">
      {message}
    </p>
  );
}

export function SupportForm({ email, orderId, onSent }: SupportFormProps) {
  const [state, action, pending] = useActionState(
    async (previous: SupportFormState, formData: FormData) => {
      const result = await sendSupportMessageAction(previous, formData);
      if (result.status === "sent") onSent?.();
      return result;
    },
    IDLE,
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "sent") {
    return (
      <Alert role="status">
        <AlertDescription>
          Recibimos tu mensaje. Te respondemos a {email} lo antes posible.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-name">Tu nombre</Label>
          <Input
            id="support-name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? "support-name-error" : undefined}
          />
          <FieldError id="support-name-error" message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-phone">Teléfono (opcional)</Label>
          <Input id="support-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-email">Correo</Label>
        <Input id="support-email" value={email} readOnly className="text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-message">
          {orderId ? `¿Qué pasa con tu pedido ${orderId.slice(0, 8).toUpperCase()}?` : "¿En qué te ayudamos?"}
        </Label>
        <Textarea
          id="support-message"
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          aria-invalid={Boolean(errors.message) || undefined}
          aria-describedby={errors.message ? "support-message-error" : undefined}
        />
        <FieldError id="support-message-error" message={errors.message} />
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <Alert role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
