import { BUSINESS } from "@/common/lib/config/business.config";
import type { PaymentMethod } from "@/common/lib/db/schema";

import { CopyAllButton } from "./copy-all-button";

type Row = { label: string; value: string; /** What goes on the clipboard; defaults to value. */ copy?: string };

/** Digits only, so a bank app can parse a pasted phone or account. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** "V-12.345.678" -> "V12345678" */
function idNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function rowsFor(method: PaymentMethod): Row[] {
  switch (method) {
    case "pago_movil":
      return [
        {
          label: "Banco",
          value: `${BUSINESS.pagoMovil.bank} (${BUSINESS.pagoMovil.bankCode})`,
          copy: BUSINESS.pagoMovil.bankCode,
        },
        { label: "Teléfono", value: BUSINESS.pagoMovil.phone, copy: digits(BUSINESS.pagoMovil.phone) },
        {
          label: "Cédula / RIF",
          value: BUSINESS.pagoMovil.idNumber,
          copy: idNumber(BUSINESS.pagoMovil.idNumber),
        },
      ];
    case "bank_transfer":
      return [
        { label: "Banco", value: BUSINESS.bankTransfer.bank },
        {
          label: "Cuenta",
          value: BUSINESS.bankTransfer.accountNumber,
          copy: digits(BUSINESS.bankTransfer.accountNumber),
        },
        { label: "Tipo", value: BUSINESS.bankTransfer.accountType },
        { label: "Titular", value: BUSINESS.bankTransfer.holder },
        {
          label: "RIF",
          value: BUSINESS.bankTransfer.idNumber,
          copy: idNumber(BUSINESS.bankTransfer.idNumber),
        },
      ];
    default:
      return [];
  }
}

type PaymentDetailsProps = {
  method: PaymentMethod;
  /** Amount in bolívares as "8.137,36"; included in the copied block. */
  amountVes: string | null;
};

/** The business's receiving details for a manual method, with one copy-everything button. */
export function PaymentDetails({ method, amountVes }: PaymentDetailsProps) {
  const rows = rowsFor(method);
  if (rows.length === 0) return null;

  const lines = rows.map((row) => `${row.label}: ${row.copy ?? row.value}`);
  if (amountVes) lines.push(`Monto: ${amountVes}`);

  return (
    <div className="space-y-3">
      <dl className="divide-y rounded-md border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-3 py-2.5">
            <dt className="w-28 shrink-0 text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-sm font-medium tabular-nums break-all">{row.value}</dd>
          </div>
        ))}
        {amountVes ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <dt className="w-28 shrink-0 text-sm text-muted-foreground">Monto</dt>
            <dd className="min-w-0 flex-1 text-sm font-semibold tabular-nums">Bs. {amountVes}</dd>
          </div>
        ) : null}
      </dl>
      <CopyAllButton text={lines.join("\n")} />
      <p className="text-xs text-muted-foreground">
        Pega el texto en tu app bancaria: la mayoría rellena destino, cédula y monto de una vez.
      </p>
    </div>
  );
}
