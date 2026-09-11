"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useActionState, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/common/components/ui/input-otp";
import { Label } from "@/common/components/ui/label";

import { verifyOtpAction } from "../../lib/actions/auth.action";
import {
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../../lib/constants/auth.constants";
import { useCountdown } from "../../lib/hooks/use-countdown.hook";
import type { RequestOtpState, VerifyOtpState } from "../../lib/types/auth.types";

const IDLE: VerifyOtpState = { status: "idle" };

type CodeStepProps = {
  email: string;
  next?: string;
  requestState: RequestOtpState;
  requestAction: (formData: FormData) => void;
  requesting: boolean;
  onChangeEmail: () => void;
};

export function CodeStep({
  email,
  next,
  requestState,
  requestAction,
  requesting,
  onChangeEmail,
}: CodeStepProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [verifyState, verifyAction, verifying] = useActionState(
    async (previous: VerifyOtpState, formData: FormData) => {
      const result = await verifyOtpAction(previous, formData);
      // Clear the slots after a rejected code so the next attempt starts clean.
      if (result.status === "error") setCode("");
      return result;
    },
    IDLE,
  );

  // The resend cooldown restarts on every successful send, and a
  // server-side "wait N seconds" answer extends it to match.
  const cooldownDeadline = useMemo(() => {
    if (requestState.status === "sent") {
      return requestState.sentAt + OTP_RESEND_COOLDOWN_SECONDS * 1000;
    }
    if (requestState.status === "error" && requestState.retryAt) {
      return requestState.retryAt;
    }
    return 0;
  }, [requestState]);
  const cooldown = useCountdown(cooldownDeadline);

  const needsNewCode =
    verifyState.status === "error" &&
    (verifyState.code === "code_expired" || verifyState.code === "too_many_attempts");
  const verifyError = verifyState.status === "error";
  const resendError = requestState.status === "error";

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Enviamos un código a <span className="font-semibold text-foreground">{email}</span>.
        Revisa también la carpeta de spam.{" "}
        <button
          type="button"
          onClick={onChangeEmail}
          className="rounded-sm font-medium text-foreground underline underline-offset-4"
        >
          Cambiar correo
        </button>
      </p>

      <form ref={formRef} action={verifyAction} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="space-y-3">
          <Label htmlFor="token">Código de {OTP_LENGTH} dígitos</Label>
          <InputOTP
            id="token"
            name="token"
            maxLength={OTP_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={setCode}
            onComplete={() => formRef.current?.requestSubmit()}
            disabled={verifying || needsNewCode}
            aria-invalid={verifyError || undefined}
            aria-describedby={verifyError ? "token-error" : undefined}
            containerClassName="justify-between"
          >
            <InputOTPGroup className="w-full justify-between gap-2 *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:flex-1 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-lg">
              {Array.from({ length: OTP_LENGTH }, (_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {verifyError ? (
          <Alert id="token-error" role="alert">
            <AlertDescription>{verifyState.message}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={verifying || needsNewCode || code.length < OTP_LENGTH}
        >
          {verifying ? "Verificando…" : "Entrar"}
        </Button>
      </form>

      <form action={requestAction} className="space-y-3 text-center">
        <input type="hidden" name="email" value={email} />
        {resendError ? (
          <Alert role="alert">
            <AlertDescription>{requestState.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          variant={needsNewCode ? "outline" : "link"}
          className={needsNewCode ? "h-11 w-full" : undefined}
          disabled={requesting || cooldown > 0}
          aria-live="polite"
        >
          {requesting
            ? "Enviando código…"
            : cooldown > 0
              ? `Reenviar código en ${cooldown} s`
              : needsNewCode
                ? "Pedir un código nuevo"
                : "Reenviar código"}
        </Button>
      </form>
    </div>
  );
}
