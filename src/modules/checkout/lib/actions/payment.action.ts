"use server";

import { redirect } from "next/navigation";

import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { ORDERS_PATHS } from "@/modules/orders/lib/constants/orders.constants";

import { CHECKOUT_PATHS, PAYMENT_STEPS } from "../constants/checkout.constants";
import { proofFileSchema, submitPaymentSchema } from "../schemas/checkout.schema";
import { submitPayment } from "../services/payment.service";
import type { PaymentFormState } from "../types/checkout.types";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function submitPaymentAction(
  _previous: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const orderId = String(formData.get("orderId") ?? "");
  const user = await requireSessionUser(CHECKOUT_PATHS.payment(orderId, PAYMENT_STEPS.report));

  const parsed = submitPaymentSchema.safeParse({
    orderId,
    reference: formData.get("reference"),
    payerName: formData.get("payerName"),
    payerPhone: formData.get("payerPhone"),
    payerBank: formData.get("payerBank"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  let proof: { buffer: Buffer; contentType: string } | null = null;
  const file = formData.get("proof");
  if (file instanceof File && file.size > 0) {
    const checked = proofFileSchema.safeParse({ type: file.type, size: file.size });
    if (!checked.success) {
      return {
        status: "error",
        message: "Revisa los campos marcados.",
        fieldErrors: { proof: checked.error.issues[0]?.message ?? "Captura no válida." },
      };
    }
    proof = { buffer: Buffer.from(await file.arrayBuffer()), contentType: checked.data.type };
  }

  const result = await submitPayment(user, parsed.data, proof);
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "wrong_status"
          ? "Este pedido ya tiene un pago en revisión o fue aprobado."
          : "No encontramos este pedido.",
    };
  }

  redirect(ORDERS_PATHS.order(result.orderId));
}
