import { z } from "zod";

/**
 * Receiving details of each manual payment method, as the admin edits
 * them and as `payment_accounts.details` stores them. Values are
 * normalized on parse so the payment screen always shows (and copies)
 * the same shape, whatever the admin typed.
 */

const ID_NUMBER_RE = /^([VEJPG])-?(\d{5,9})(?:-?(\d))?$/i;
const PHONE_RE = /^(?:\+?58|0)?((?:2\d{2}|4\d{2})\d{7})$/;

const bankSchema = z
  .string()
  .trim()
  .min(2, { error: "Escribe el nombre del banco." })
  .max(80, { error: "Máximo 80 caracteres." });

/** "v 12.345.678" -> "V-12345678"; a RIF keeps its check digit: "J-12345678-9". */
const idNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.]/g, ""))
  .pipe(z.string().regex(ID_NUMBER_RE, { error: "Escribe la cédula o el RIF con su letra, por ejemplo V-12345678 o J-12345678-9." }))
  .transform((value) => {
    const [, letter, digits, check] = ID_NUMBER_RE.exec(value) ?? [];
    return `${letter?.toUpperCase()}-${digits}${check ? `-${check}` : ""}`;
  });

/** "+58 412 123 4567" -> "0412-1234567". */
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(PHONE_RE, { error: "Escribe un teléfono venezolano, por ejemplo 0412-1234567." }))
  .transform((value) => {
    const local = PHONE_RE.exec(value)?.[1] ?? value;
    return `0${local.slice(0, 3)}-${local.slice(3)}`;
  });

/** 20 digits, shown as "0102-0000-00-0000000000". */
const accountNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().length(20, { error: "La cuenta debe tener 20 dígitos." }))
  .transform((value) => `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 10)}-${value.slice(10)}`);

export const ACCOUNT_TYPES = ["Corriente", "Ahorro"] as const;

export const pagoMovilDetailsSchema = z.object({
  bank: bankSchema,
  bankCode: z.string().trim().regex(/^\d{4}$/, { error: "El código del banco son 4 dígitos, por ejemplo 0102." }),
  phone: phoneSchema,
  idNumber: idNumberSchema,
});

export const bankTransferDetailsSchema = z
  .object({
    bank: bankSchema,
    accountNumber: accountNumberSchema,
    accountType: z.enum(ACCOUNT_TYPES, { error: "Elige corriente o ahorro." }),
    holder: z.string().trim().min(2, { error: "Escribe el titular." }).max(120),
    idNumber: idNumberSchema,
  });

export type PagoMovilDetails = z.infer<typeof pagoMovilDetailsSchema>;
export type BankTransferDetails = z.infer<typeof bankTransferDetailsSchema>;

/** Both editable methods, as the payment screen and the admin read them. */
export type PaymentAccounts = {
  pago_movil: PagoMovilDetails;
  bank_transfer: BankTransferDetails;
};

export type EditablePaymentMethod = keyof PaymentAccounts;

export const PAYMENT_DETAILS_SCHEMAS = {
  pago_movil: pagoMovilDetailsSchema,
  bank_transfer: bankTransferDetailsSchema,
} as const;
