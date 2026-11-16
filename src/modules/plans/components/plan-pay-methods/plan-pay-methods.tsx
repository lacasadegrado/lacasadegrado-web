"use client";

import { useId, useState } from "react";

import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import type { PaymentMethod } from "@/common/lib/db/schema";
import { PaymentDetails } from "@/modules/checkout/components/payment-details";
import type { PaymentAccounts } from "@/modules/checkout/lib/schemas/payment-account.schema";

type PlanPayMethodsProps = {
  methods: { id: PaymentMethod; label: string; description: string }[];
  accounts: PaymentAccounts;
};

/**
 * "Cómo pagar" on a package: the person picks a method and sees only its
 * receiving details. Nothing is stored; the report form asks for the
 * reference whichever method they used.
 */
export function PlanPayMethods({ methods, accounts }: PlanPayMethodsProps) {
  const id = useId();
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const current = methods.find((method) => method.id === selected) ?? null;

  return (
    <div className="space-y-4">
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={selected ?? ""}
        onValueChange={(value) => setSelected(value as PaymentMethod)}
        className="grid gap-2 sm:grid-cols-2"
      >
        <p id={`${id}-label`} className="sr-only">
          Método de pago
        </p>
        {methods.map((method) => {
          const itemId = `${id}-${method.id}`;
          return (
            <Label
              key={method.id}
              htmlFor={itemId}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-amber has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-amber"
            >
              <RadioGroupItem id={itemId} value={method.id} />
              <span className="flex-1">
                <span className="block font-medium">{method.label}</span>
                <span className="block text-xs text-muted-foreground">{method.description}</span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      {current ? (
        <div className="space-y-2" aria-live="polite">
          <h3 className="font-semibold">Datos para {current.label}</h3>
          <PaymentDetails method={current.id} accounts={accounts} amountVes={null} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Elige cómo vas a pagar para ver los datos.</p>
      )}
    </div>
  );
}
