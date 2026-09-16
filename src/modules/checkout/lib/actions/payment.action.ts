"use server";

import { redirect } from "next/navigation";

import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { ORDERS_PATHS } from "@/modules/orders/lib/constants/orders.constants";

import { CHECKOUT_PATHS, PAYMENT_STEPS } from "../constants/checkout.constants";
import { prepareProofUploadSchema, submitPaymentSchema } from "../schemas/checkout.schema";
import { getProofUploadUrl, submitPayment } from "../services/payment.service";
import type { PaymentFormState, PrepareProofUploadResult } from "../types/checkout.types";

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
    proofKey: formData.get("proofKey") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const result = await submitPayment(user, parsed.data);
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "wrong_status"
          ? "Este pedido ya tiene un pago en revisión o fue aprobado."
          : result.reason === "proof_invalid"
            ? "La captura no llegó completa. Adjúntala de nuevo."
            : "No encontramos este pedido.",
      fieldErrors:
        result.reason === "proof_invalid" ? { proof: "Vuelve a adjuntar la captura." } : undefined,
    };
  }

  redirect(ORDERS_PATHS.order(result.orderId));
}

/** Presigned PUT for the proof screenshot; the browser uploads it straight to R2. */
export async function preparePaymentProofUploadAction(input: {
  orderId: string;
  type: string;
  size: number;
}): Promise<PrepareProofUploadResult> {
  const user = await requireSessionUser(CHECKOUT_PATHS.payment(input.orderId, PAYMENT_STEPS.report));
  const parsed = prepareProofUploadSchema.safeParse({
    orderId: input.orderId,
    file: { type: input.type, size: input.size },
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Captura no válida." };
  }
  const result = await getProofUploadUrl(user, parsed.data.orderId, parsed.data.file.type);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "wrong_status"
          ? "Este pedido ya tiene un pago en revisión o fue aprobado."
          : "No encontramos este pedido.",
    };
  }
  return { ok: true, key: result.key, uploadUrl: result.uploadUrl };
}
