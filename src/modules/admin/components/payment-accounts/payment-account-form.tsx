"use client";

import { useId, useState, useTransition } from "react";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { PaymentDetails } from "@/modules/checkout/components/payment-details";
import {
  ACCOUNT_TYPES,
  type EditablePaymentMethod,
  type PaymentAccounts,
} from "@/modules/checkout/lib/schemas/payment-account.schema";

import { savePaymentAccountAction } from "../../lib/actions/payment-account.action";

type FieldConfig = {
  name: string;
  label: string;
  placeholder?: string;
  help?: string;
  inputMode?: "numeric" | "tel" | "text";
  options?: readonly string[];
};

const FIELDS: Record<EditablePaymentMethod, FieldConfig[]> = {
  pago_movil: [
    { name: "bank", label: "Banco", placeholder: "Banco de Venezuela" },
    {
      name: "bankCode",
      label: "Código del banco",
      placeholder: "0102",
      inputMode: "numeric",
      help: "Los 4 dígitos que piden las apps bancarias para el Pago Móvil.",
    },
    { name: "phone", label: "Teléfono", placeholder: "0412-1234567", inputMode: "tel" },
    { name: "idNumber", label: "Cédula o RIF", placeholder: "V-12345678" },
  ],
  bank_transfer: [
    { name: "bank", label: "Banco", placeholder: "Banco de Venezuela" },
    {
      name: "accountNumber",
      label: "Número de cuenta",
      placeholder: "0102-0000-00-0000000000",
      inputMode: "numeric",
      help: "Los 20 dígitos; puedes escribirlos con o sin guiones.",
    },
    { name: "accountType", label: "Tipo de cuenta", options: ACCOUNT_TYPES },
    { name: "holder", label: "Titular", placeholder: "La Casa de Grado C.A." },
    { name: "idNumber", label: "RIF o cédula del titular", placeholder: "J-12345678-9" },
  ],
};

type PaymentAccountFormProps = {
  method: EditablePaymentMethod;
  title: string;
  /** Saved values (or the placeholders), used for the preview of the other method too. */
  accounts: PaymentAccounts;
  /** Null while this method still shows the business.config placeholders. */
  updatedAt: Date | null;
};

/**
 * Edits one method's receiving details. The preview is the exact block
 * the customer sees on the payment screen, fed with the draft.
 */
export function PaymentAccountForm({ method, title, accounts, updatedAt: savedAt }: PaymentAccountFormProps) {
  const id = useId();
  const [draft, setDraft] = useState<Record<string, string>>(
    () => ({ ...accounts[method] }) as Record<string, string>,
  );
  const [saved, setSaved] = useState<Record<string, string>>(draft);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(savedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await savePaymentAccountAction({ method, details: draft });
      if (result.ok) {
        const normalized = result.details as Record<string, string>;
        setDraft(normalized);
        setSaved(normalized);
        setUpdatedAt(result.updatedAt);
        setErrors({});
        setMessage({ ok: true, text: result.message });
      } else {
        setErrors(result.fieldErrors ?? {});
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-6 rounded-lg border p-4 sm:p-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          {updatedAt ? (
            <p className="text-sm text-muted-foreground">Última modificación: {formatDateTime(updatedAt)}</p>
          ) : (
            <Badge variant="outline">Datos de ejemplo: todavía no guardados</Badge>
          )}
        </div>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {FIELDS[method].map((field) => {
            const inputId = `${id}-${field.name}`;
            const error = errors[field.name];
            const describedBy =
              [field.help ? `${inputId}-help` : null, error ? `${inputId}-error` : null].filter(Boolean).join(" ") ||
              undefined;
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={inputId}>{field.label}</Label>
                {field.options ? (
                  <NativeSelect
                    id={inputId}
                    value={draft[field.name] ?? ""}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={describedBy}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  >
                    {field.options.map((option) => (
                      <NativeSelectOption key={option} value={option}>
                        {option}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id={inputId}
                    value={draft[field.name] ?? ""}
                    placeholder={field.placeholder}
                    inputMode={field.inputMode}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={describedBy}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                )}
                {field.help ? (
                  <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
                    {field.help}
                  </p>
                ) : null}
                {error ? (
                  <p id={`${inputId}-error`} className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}

          {message ? (
            <p
              role={message.ok ? "status" : "alert"}
              className={message.ok ? "text-sm font-medium" : "text-sm font-medium text-destructive"}
            >
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || (!dirty && updatedAt !== null)}>
              {pending ? "Guardando…" : "Guardar datos"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !dirty}
              onClick={() => {
                setDraft(saved);
                setErrors({});
                setMessage(null);
              }}
            >
              Descartar cambios
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Así lo ve el cliente</p>
        <PaymentDetails
          method={method}
          accounts={{ ...accounts, [method]: draft } as PaymentAccounts}
          amountVes={null}
        />
      </div>
    </section>
  );
}
