import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/common/lib/config/env.config";

const globalForEmail = globalThis as unknown as { __lcgResend?: Resend };

function getClient(): Resend {
  if (!globalForEmail.__lcgResend) {
    globalForEmail.__lcgResend = new Resend(getServerEnv().RESEND_API_KEY);
  }
  return globalForEmail.__lcgResend;
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Set when the business should answer the sender directly. */
  replyTo?: string;
};

/**
 * Transactional email through Resend. Returns false instead of throwing:
 * a failed notification must never roll back the business action that
 * triggered it. Callers log context; this logs the provider error.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    const { error } = await getClient().emails.send({
      from: getServerEnv().RESEND_FROM_EMAIL,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    if (error) {
      console.error("[email] send failed", { name: error.name, message: error.message });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send threw", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
