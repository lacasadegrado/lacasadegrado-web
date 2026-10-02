import "server-only";

import { db } from "@/common/lib/db";
import { paymentAccounts } from "@/common/lib/db/schema";
import type {
  BankTransferDetails,
  EditablePaymentMethod,
  PagoMovilDetails,
} from "@/modules/checkout/lib/schemas/payment-account.schema";

/** One row per method: insert the first time, overwrite after. */
export async function savePaymentAccount(
  method: EditablePaymentMethod,
  details: PagoMovilDetails | BankTransferDetails,
  adminId: string,
): Promise<{ updatedAt: Date }> {
  const [row] = await db
    .insert(paymentAccounts)
    .values({ method, details, updatedBy: adminId })
    .onConflictDoUpdate({
      target: paymentAccounts.method,
      set: { details, updatedBy: adminId, updatedAt: new Date() },
    })
    .returning({ updatedAt: paymentAccounts.updatedAt });
  return row;
}
