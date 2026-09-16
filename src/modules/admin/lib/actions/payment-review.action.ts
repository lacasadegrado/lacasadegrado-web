"use server";

import { revalidatePath } from "next/cache";

import { BUSINESS } from "@/common/lib/config/business.config";
import { getServerEnv } from "@/common/lib/config/env.config";
import { sendEmail } from "@/common/lib/email/email.service";
import {
  buildPaymentApprovedEmail,
  buildPaymentRejectedEmail,
} from "@/modules/orders/lib/utils/order-email.util";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { approvePaymentSchema, rejectPaymentSchema } from "../schemas/payment-review.schema";
import { requireAdmin } from "../services/admin-access.service";
import { approvePayment, rejectPayment } from "../services/payment-review.service";
import type { ActionState } from "../types/admin.types";

const WRONG_STATUS = "Este pedido ya fue revisado o cambió de estado. Recarga la lista.";

export async function approvePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = approvePaymentSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { status: "error", message: "Pedido no válido." };

  const result = await approvePayment(admin.id, parsed.data.orderId);
  if (!result.ok) {
    return {
      status: "error",
      message: result.reason === "wrong_status" ? WRONG_STATUS : "No encontramos el pedido.",
    };
  }

  if (result.order) {
    const email = buildPaymentApprovedEmail({
      orderId: result.order.orderId,
      totalCents: result.order.totalCents,
      photoCount: result.order.entitlementsGranted,
      printCount: result.order.printCount,
      printDeliveryDays: BUSINESS.print.deliveryDays,
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
    });
    const sent = await sendEmail({ to: result.order.customerEmail, ...email });
    if (!sent) console.error("[admin] approval email not sent", { orderId: result.order.orderId });
  }

  revalidatePath(ADMIN_PATHS.payments);
  return {
    status: "success",
    message: `Pago aprobado. ${result.entitlementsGranted ?? 0} foto${result.entitlementsGranted === 1 ? "" : "s"} habilitada${result.entitlementsGranted === 1 ? "" : "s"} para descarga.`,
  };
}

export async function rejectPaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = rejectPaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el motivo.",
      fieldErrors: { reason: parsed.error.issues[0]?.message ?? "" },
    };
  }

  const result = await rejectPayment(admin.id, parsed.data.orderId, parsed.data.reason);
  if (!result.ok) {
    return {
      status: "error",
      message: result.reason === "wrong_status" ? WRONG_STATUS : "No encontramos el pedido.",
    };
  }

  if (result.order) {
    const email = buildPaymentRejectedEmail({
      orderId: result.order.orderId,
      reason: result.order.reason,
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
    });
    const sent = await sendEmail({ to: result.order.customerEmail, ...email });
    if (!sent) console.error("[admin] rejection email not sent", { orderId: result.order.orderId });
  }

  revalidatePath(ADMIN_PATHS.payments);
  return { status: "success", message: "Pago rechazado. Avisamos a la persona por correo." };
}
