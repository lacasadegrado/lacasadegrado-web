import "server-only";

import { BUSINESS } from "@/common/lib/config/business.config";
import { db } from "@/common/lib/db";
import { paymentAccounts } from "@/common/lib/db/schema";

import {
  PAYMENT_DETAILS_SCHEMAS,
  type EditablePaymentMethod,
  type PaymentAccounts,
} from "../schemas/payment-account.schema";

/** The placeholders in business.config, until the admin saves real data. */
const FALLBACK: PaymentAccounts = {
  pago_movil: { ...BUSINESS.pagoMovil },
  bank_transfer: { ...BUSINESS.bankTransfer, accountType: "Corriente" },
};

export type PaymentAccountsWithMeta = {
  accounts: PaymentAccounts;
  /** When each method was last saved; null while it still shows the placeholders. */
  updatedAt: Record<EditablePaymentMethod, Date | null>;
};

/**
 * Receiving details for the payment screen and the admin. A row that no
 * longer parses (shouldn't happen: it was validated on save) falls back
 * to the placeholders instead of breaking checkout, and is logged.
 */
export async function getPaymentAccounts(): Promise<PaymentAccountsWithMeta> {
  const rows = await db.select().from(paymentAccounts);
  const accounts: PaymentAccounts = { ...FALLBACK };
  const updatedAt: PaymentAccountsWithMeta["updatedAt"] = { pago_movil: null, bank_transfer: null };

  for (const row of rows) {
    if (row.method === "pago_movil") {
      const parsed = PAYMENT_DETAILS_SCHEMAS.pago_movil.safeParse(row.details);
      if (parsed.success) {
        accounts.pago_movil = parsed.data;
        updatedAt.pago_movil = row.updatedAt;
      } else console.error("[checkout] stored pago_movil details do not parse");
    } else if (row.method === "bank_transfer") {
      const parsed = PAYMENT_DETAILS_SCHEMAS.bank_transfer.safeParse(row.details);
      if (parsed.success) {
        accounts.bank_transfer = parsed.data;
        updatedAt.bank_transfer = row.updatedAt;
      } else console.error("[checkout] stored bank_transfer details do not parse");
    }
  }
  return { accounts, updatedAt };
}
