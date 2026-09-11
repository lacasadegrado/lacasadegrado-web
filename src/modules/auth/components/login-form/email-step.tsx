"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import type { RequestOtpState } from "../../lib/types/auth.types";

type EmailStepProps = {
  state: RequestOtpState;
  action: (formData: FormData) => void;
  pending: boolean;
};

export function EmailStep({ state, action, pending }: EmailStepProps) {
  // Controlled so the typed address survives a failed submit.
  const [email, setEmail] = useState("");
  const hasError = state.status === "error";

  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "email-error" : "email-hint"}
          className="h-11 text-base"
        />
        <p id="email-hint" className="text-sm text-muted-foreground">
          Te enviaremos un código de 6 dígitos. No necesitas contraseña.
        </p>
      </div>

      {hasError ? (
        <Alert id="email-error" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? "Enviando código…" : "Enviar código"}
      </Button>
    </form>
  );
}
