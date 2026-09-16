"use server";

import { revalidatePath } from "next/cache";

import { BUSINESS } from "@/common/lib/config/business.config";
import { getServerEnv } from "@/common/lib/config/env.config";
import { sendEmail } from "@/common/lib/email/email.service";
import { buildPrintDeliveredEmail } from "@/modules/orders/lib/utils/order-email.util";
import { ORDERS_PATHS } from "@/modules/orders/lib/constants/orders.constants";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { markPrintsDeliveredSchema } from "../schemas/admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import { markPrintsDelivered } from "../services/print.service";
import type { ActionState } from "../types/admin.types";

export async function markPrintsDeliveredAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = markPrintsDeliveredSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { status: "error", message: "Pedido no válido." };

  const result = await markPrintsDelivered(parsed.data.orderId);
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "wrong_status"
          ? "Este pedido ya fue marcado como entregado o no está pagado. Recarga la lista."
          : "No encontramos el pedido.",
    };
  }

  const email = buildPrintDeliveredEmail({
    orderId: result.job.orderId,
    printCount: result.job.printCount,
    institution: result.job.institution,
    responsibilityDays: BUSINESS.print.responsibilityDays,
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
  });
  const sent = await sendEmail({ to: result.job.customerEmail, ...email });
  if (!sent) console.error("[admin] print delivered email not sent", { orderId: result.job.orderId });

  revalidatePath(ADMIN_PATHS.prints);
  revalidatePath(ORDERS_PATHS.order(result.job.orderId));
  return { status: "success", message: "Entrega registrada. Avisamos a la persona por correo." };
}
