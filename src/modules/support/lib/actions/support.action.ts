"use server";

import { getServerEnv } from "@/common/lib/config/env.config";
import { sendEmail } from "@/common/lib/email/email.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { SUPPORT_MESSAGES } from "../constants/support.constants";
import { supportMessageSchema, whatsappContactSchema } from "../schemas/support.schema";
import { createSupportMessage, isOverMessageLimit } from "../services/support.service";
import type { SupportFormState } from "../types/support.types";
import { buildSupportNotificationEmail } from "../utils/support-email.util";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function sendSupportMessageAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Tu sesión terminó. Vuelve a entrar." };

  const parsed = supportMessageSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
    message: formData.get("message"),
    orderId: formData.get("orderId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  if (await isOverMessageLimit(user)) {
    return {
      status: "error",
      message: "Ya nos enviaste varios mensajes. Te respondemos pronto; si es urgente, escríbenos por WhatsApp.",
    };
  }

  await createSupportMessage(user, {
    channel: "form",
    name: parsed.data.name,
    phone: parsed.data.phone,
    message: parsed.data.orderId
      ? `[Pedido ${parsed.data.orderId}]\n${parsed.data.message}`
      : parsed.data.message,
  });

  const env = getServerEnv();
  const email = buildSupportNotificationEmail({
    name: parsed.data.name,
    email: user.email,
    phone: parsed.data.phone,
    orderId: parsed.data.orderId,
    message: parsed.data.message,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: env.SUPPORT_NOTIFY_EMAIL, replyTo: user.email, ...email });
  if (!sent) console.error("[support] notification email not sent", { email: user.email });

  return { status: "sent" };
}

/**
 * Fired when the WhatsApp link is opened, so the contact exists even if
 * the conversation never comes back to us. Best effort; never blocks.
 */
export async function logWhatsappContactAction(input: { orderId?: string }): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const parsed = whatsappContactSchema.safeParse(input);
  const orderId = parsed.success ? parsed.data.orderId : undefined;
  await createSupportMessage(user, {
    channel: "whatsapp",
    name: user.email,
    message: orderId
      ? SUPPORT_MESSAGES.order(user.email, orderId)
      : SUPPORT_MESSAGES.general(user.email),
  });
}

