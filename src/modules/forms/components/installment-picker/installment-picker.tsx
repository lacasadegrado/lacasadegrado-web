"use client";

import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";

import { amountForInstallments } from "../../lib/utils/installments.util";

type InstallmentPickerProps = {
  id: string;
  priceCents: number;
  installments: number;
  /** Parts already paid or under review; the choice starts after them. */
  reserved: number;
  value: number;
  onChange: (installments: number) => void;
  eurToVes: number | null;
  error?: string;
};

/**
 * "How much do you pay now?": one, several or every remaining part of the
 * package, each with its amount in euros and bolívares at today's rate.
 */
export function InstallmentPicker({
  id,
  priceCents,
  installments,
  reserved,
  value,
  onChange,
  eurToVes,
  error,
}: InstallmentPickerProps) {
  const remaining = installments - reserved;
  const labelId = `${id}-label`;
  const errorId = error ? `${id}-error` : undefined;
  const choices = Array.from({ length: remaining }, (_, index) => index + 1);

  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm font-medium">
        ¿Cuánto pagas ahora? <span aria-hidden="true">*</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {reserved === 0
          ? `Puedes pagar en ${installments} cuotas. Paga una, varias o todo de una vez; con el enlace que te enviamos haces los siguientes abonos sin volver a llenar tus datos.`
          : `Te ${remaining === 1 ? "queda 1 cuota" : `quedan ${remaining} cuotas`} de ${installments}.`}
      </p>
      <RadioGroup
        aria-labelledby={labelId}
        aria-describedby={errorId}
        aria-invalid={Boolean(error) || undefined}
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
        className="gap-2"
      >
        {choices.map((count) => {
          const amount = amountForInstallments(priceCents, installments, reserved, count);
          const itemId = `${id}-${count}`;
          const all = count === remaining;
          return (
            <Label
              key={count}
              htmlFor={itemId}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-amber has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-amber"
            >
              <RadioGroupItem id={itemId} value={String(count)} />
              <span className="flex-1">
                {all
                  ? reserved === 0
                    ? "Todo el paquete"
                    : "Todo lo que falta"
                  : `${count} cuota${count === 1 ? "" : "s"}`}
                {all && count > 1 ? (
                  <span className="text-muted-foreground"> · {count} cuotas</span>
                ) : null}
              </span>
              <span className="text-right tabular-nums">
                <span className="block font-semibold">{formatEur(amount)}</span>
                {eurToVes ? (
                  <span className="block text-xs text-muted-foreground">{formatVes(amount, eurToVes)}</span>
                ) : null}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
