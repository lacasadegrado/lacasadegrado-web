"use server";

import { revalidatePath } from "next/cache";

import { getServerEnv } from "@/common/lib/config/env.config";
import { sendEmail } from "@/common/lib/email/email.service";
import { formatEur } from "@/common/lib/utils/money.util";
import { FORMS_PATHS } from "@/modules/forms/lib/constants/forms.constants";
import { buildPackagePaymentReviewedEmail } from "@/modules/forms/lib/utils/form-email.util";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { confirmPackagePaymentSchema, rejectPackagePaymentSchema } from "../schemas/payment-review.schema";
import { requireAdmin } from "../services/admin-access.service";
import { notifyAdmins } from "../services/notification.service";
import { reviewPackagePayment, type PackageReviewOutcome } from "../services/package-review.service";
import type { ActionState } from "../types/admin.types";

const WRONG_STATUS = "Este pago ya fue revisado. Recarga la página.";

/** Tells the person, and the admins when a package is fully paid. Failures never undo the review. */
async function afterReview(result: Extract<PackageReviewOutcome, { ok: true }>, reason: string | null) {
  const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL;
  if (result.email && result.packageName) {
    const email = buildPackagePaymentReviewedEmail({
      outcome: result.outcome,
      eventName: result.eventName,
      packageName: result.packageName,
      amountCents: result.amountCents,
      confirmedCents: result.confirmedCents,
      priceCents: result.priceCents,
      reason,
      planUrl: result.planUrl,
      formUrl: `${appUrl}${FORMS_PATHS.public(result.formSlug)}`,
      appUrl,
    });
    const sent = await sendEmail({ to: result.email, ...email });
    if (!sent) console.error("[admin] package review email not sent", { planId: result.planId });
  }
  if (result.outcome === "paid" && result.planId) {
    await notifyAdmins({
      kind: "package_paid",
      title: "Paquete pagado completo",
      body: `${result.personName ?? result.email ?? "Sin correo"} · ${result.packageName ?? "Paquete"} · ${formatEur(result.priceCents)}`,
      href: ADMIN_PATHS.packagePlan(result.planId),
    });
  }
  // Pagos › Paquetes, Abonos and their detail pages.
  revalidatePath(ADMIN_PATHS.payments, "layout");
}

export async function confirmPackagePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = confirmPackagePaymentSchema.safeParse({ submissionId: formData.get("submissionId") });
  if (!parsed.success) return { status: "error", message: "Pago no válido." };

  const result = await reviewPackagePayment(admin.id, parsed.data.submissionId, { action: "confirm" });
  if (!result.ok) {
    return { status: "error", message: result.reason === "wrong_status" ? WRONG_STATUS : "No encontramos el pago." };
  }
  await afterReview(result, null);
  return {
    status: "success",
    message:
      result.outcome === "paid"
        ? "Pago confirmado. Con esto el paquete quedó pagado completo."
        : `Pago confirmado. Lleva ${formatEur(result.confirmedCents)} de ${formatEur(result.priceCents)}.`,
  };
}

export async function rejectPackagePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = rejectPackagePaymentSchema.safeParse({
    submissionId: formData.get("submissionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa el motivo.",
      fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Motivo no válido." },
    };
  }

  const result = await reviewPackagePayment(admin.id, parsed.data.submissionId, {
    action: "reject",
    reason: parsed.data.reason,
  });
  if (!result.ok) {
    return { status: "error", message: result.reason === "wrong_status" ? WRONG_STATUS : "No encontramos el pago." };
  }
  await afterReview(result, parsed.data.reason);
  return {
    status: "success",
    message: result.email
      ? "Pago rechazado. Le enviamos el motivo y un enlace nuevo para reportarlo otra vez."
      : "Pago rechazado.",
  };
}
