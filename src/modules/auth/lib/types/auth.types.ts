/** The only shape of "who is logged in" the rest of the app consumes. */
export type SessionUser = {
  id: string;
  email: string;
};

export type RequestOtpErrorCode =
  | "invalid_email"
  | "cooldown"
  | "rate_limited"
  | "send_failed";

export type VerifyOtpErrorCode =
  | "invalid_code"
  | "code_wrong"
  | "code_expired"
  | "too_many_attempts"
  | "verify_failed";

export type RequestOtpState =
  | { status: "idle" }
  | { status: "sent"; email: string; sentAt: number }
  | {
      status: "error";
      code: RequestOtpErrorCode;
      message: string;
      /** Epoch ms when the user may try again, for cooldown-style errors. */
      retryAt?: number;
    };

export type VerifyOtpState =
  | { status: "idle" }
  | { status: "error"; code: VerifyOtpErrorCode; message: string };

export type RequestOtpOutcome =
  | { ok: true }
  | { ok: false; code: RequestOtpErrorCode; retryAfterSeconds?: number };

export type VerifyOtpOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; code: VerifyOtpErrorCode };
