"use client";

import { useActionState } from "react";

import { CodeStep } from "@/modules/auth/components/login-form/code-step";
import { requestOtpAction } from "@/modules/auth/lib/actions/auth.action";
import type { RequestOtpState } from "@/modules/auth/lib/types/auth.types";
import { PLANS_PATHS } from "@/modules/plans/lib/constants/plans.constants";

/**
 * Right after a package sign-up: the code we just sent to their email, and
 * then "Pagos". Same code step, limits and resend as the login page; the
 * email is fixed because the package is tied to it.
 */
export function SignupCodeStep({ email, sentAt }: { email: string; sentAt: number }) {
  const [requestState, requestAction, requesting] = useActionState(
    requestOtpAction,
    { status: "sent", email, sentAt } satisfies RequestOtpState,
  );
  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold">Entra para pagar tu paquete</h3>
      <CodeStep
        email={email}
        next={PLANS_PATHS.list}
        requestState={requestState}
        requestAction={requestAction}
        requesting={requesting}
      />
    </div>
  );
}
