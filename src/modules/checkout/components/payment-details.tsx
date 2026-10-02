import { CopyButton } from "@/common/components/copy-button/copy-button";
import type { PaymentMethod } from "@/common/lib/db/schema";

import type { PaymentAccounts } from "../lib/schemas/payment-account.schema";

type Row = { label: string; value: string; /** What goes on the clipboard; defaults to value. */ copy?: string };

/** Digits only, so a bank app can parse a pasted phone or account. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** "V-12.345.678" -> "V12345678" */
function idNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function rowsFor(method: PaymentMethod, accounts: PaymentAccounts): Row[] {
  const pagoMovil = accounts.pago_movil;
  const bankTransfer = accounts.bank_transfer;
  switch (method) {
    case "pago_movil":
      return [
        {
          label: "Banco",
          value: `${pagoMovil.bank} (${pagoMovil.bankCode})`,
          copy: pagoMovil.bankCode,
        },
        { label: "Teléfono", value: pagoMovil.phone, copy: digits(pagoMovil.phone) },
        {
          label: "Cédula / RIF",
          value: pagoMovil.idNumber,
          copy: idNumber(pagoMovil.idNumber),
        },
      ];
    case "bank_transfer":
      return [
        { label: "Banco", value: bankTransfer.bank },
        {
          label: "Cuenta",
          value: bankTransfer.accountNumber,
          copy: digits(bankTransfer.accountNumber),
        },
        { label: "Tipo", value: bankTransfer.accountType },
        { label: "Titular", value: bankTransfer.holder },
        {
          label: "Cédula / RIF",
          value: bankTransfer.idNumber,
          copy: idNumber(bankTransfer.idNumber),
        },
      ];
    default:
      return [];
  }
}

type PaymentDetailsProps = {
  method: PaymentMethod;
  /** From `getPaymentAccounts()`; the admin preview passes its draft. */
  accounts: PaymentAccounts;
  /** Amount in bolívares as "8.137,36"; last row and part of the copied block. */
  amountVes: string | null;
};

function DetailRow({ label, value, copy, strong }: Row & { strong?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={`text-sm tabular-nums break-all ${strong ? "font-semibold" : "font-medium"}`}>
          {value}
        </dd>
      </div>
      <CopyButton
        text={copy ?? value}
        label="Copiar"
        copiedLabel="Copiado"
        ariaLabel={`Copiar ${label.toLowerCase()}`}
        variant="ghost"
        size="sm"
        className="shrink-0 underline-offset-4 hover:underline"
      />
    </div>
  );
}

/** The business's receiving details for a manual method: one copy per row, plus copy-everything. */
export function PaymentDetails({ method, accounts, amountVes }: PaymentDetailsProps) {
  const rows = rowsFor(method, accounts);
  if (rows.length === 0) return null;

  const lines = rows.map((row) => `${row.label}: ${row.copy ?? row.value}`);
  if (amountVes) lines.push(`Monto: ${amountVes}`);

  return (
    <div className="space-y-3">
      <dl className="divide-y rounded-md border">
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
        {amountVes ? <DetailRow label="Monto" value={`Bs. ${amountVes}`} copy={amountVes} strong /> : null}
      </dl>
      <CopyButton
        text={lines.join("\n")}
        label="Copiar todos los datos"
        copiedLabel="Datos copiados"
        variant="outline"
        size="lg"
        className="h-11 w-full"
      />
      <p className="text-xs text-muted-foreground">
        Pega el texto en tu app bancaria: la mayoría rellena destino, cédula y monto de una vez.
      </p>
    </div>
  );
}
