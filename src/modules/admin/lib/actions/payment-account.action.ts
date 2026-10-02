"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CHECKOUT_PATHS } from "@/modules/checkout/lib/constants/checkout.constants";
import {
  PAYMENT_DETAILS_SCHEMAS,
  type BankTransferDetails,
  type EditablePaymentMethod,
  type PagoMovilDetails,
} from "@/modules/checkout/lib/schemas/payment-account.schema";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { requireAdmin } from "../services/admin-access.service";
import { savePaymentAccount } from "../services/payment-account.service";

export type SavePaymentAccountResult =
  | { ok: true; message: string; details: PagoMovilDetails | BankTransferDetails; updatedAt: Date }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const methodSchema = z.enum(["pago_movil", "bank_transfer"]);

/** Validates and normalizes the details, then saves them for that method. */
export async function savePaymentAccountAction(input: {
  method: EditablePaymentMethod;
  details: Record<string, string>;
}): Promise<SavePaymentAccountResult> {
  const admin = await requireAdmin();

  const method = methodSchema.safeParse(input.method);
  if (!method.success) return { ok: false, message: "Método no válido." };

  const parsed = PAYMENT_DETAILS_SCHEMAS[method.data].safeParse(input.details);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
  }

  const { updatedAt } = await savePaymentAccount(method.data, parsed.data, admin.id);
  revalidatePath(ADMIN_PATHS.paymentMethods);
  // The payment screen reads these on every request; this drops any cached render.
  revalidatePath(CHECKOUT_PATHS.checkout, "layout");
  return { ok: true, message: "Datos guardados. Ya se muestran en la pantalla de pago.", details: parsed.data, updatedAt };
}
