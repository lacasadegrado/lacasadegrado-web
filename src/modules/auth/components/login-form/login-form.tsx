"use client";

import { useActionState, useState } from "react";

import { requestOtpAction } from "../../lib/actions/auth.action";
import type { RequestOtpState } from "../../lib/types/auth.types";
import { CodeStep } from "./code-step";
import { EmailStep } from "./email-step";

const IDLE: RequestOtpState = { status: "idle" };

type LoginFormProps = {
  /** Safe same-origin path to return to after login. */
  next?: string;
};

/**
 * Two steps on one screen: email, then the 6-digit code. The request
 * action is shared so "resend" in step two reuses the same state and
 * rate limiting as the first send.
 */
export function LoginForm({ next }: LoginFormProps) {
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const [requestState, requestAction, requesting] = useActionState(
    async (previous: RequestOtpState, formData: FormData) => {
      const result = await requestOtpAction(previous, formData);
      if (result.status === "sent") setSentEmail(result.email);
      return result;
    },
    IDLE,
  );

  if (sentEmail) {
    const sentAt = requestState.status === "sent" ? requestState.sentAt : 0;
    return (
      <CodeStep
        key={`${sentEmail}:${sentAt}`}
        email={sentEmail}
        next={next}
        requestState={requestState}
        requestAction={requestAction}
        requesting={requesting}
        onChangeEmail={() => setSentEmail(null)}
      />
    );
  }

  return (
    <EmailStep state={requestState} action={requestAction} pending={requesting} />
  );
}
