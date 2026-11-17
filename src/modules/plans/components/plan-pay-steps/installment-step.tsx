"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { amountForInstallments } from "@/modules/forms/lib/utils/installments.util";

import { PLANS_PATHS } from "../../lib/constants/plans.constants";
import { PayBottomBar } from "./pay-chrome";

type InstallmentStepProps = {
  planId: string;
  priceCents: number;
  installments: number;
  /** Parts paid or being checked; the choice starts after them. */
  reserved: number;
  eurToVes: number | null;
  /** Coming back from step 2 keeps the choice. */
  initialCount: number | null;
};

/** Step 1: "¿Cuánto quieres pagar?", one row per number of installments, Continuar disabled until one is picked. */
export function InstallmentStep({
  planId,
  priceCents,
  installments,
  reserved,
  eurToVes,
  initialCount,
}: InstallmentStepProps) {
  const router = useRouter();
  const remaining = installments - reserved;
  const [count, setCount] = useState<number | null>(initialCount ?? (remaining === 1 ? 1 : null));
  const choices = Array.from({ length: remaining }, (_, index) => index + 1);
  const total = count ? amountForInstallments(priceCents, installments, reserved, count) : null;

  return (
    <>
      <RadioGroup
        aria-label="Cuántas cuotas pagas ahora"
        value={count ? String(count) : ""}
        onValueChange={(value) => setCount(Number(value))}
        className="gap-0 divide-y rounded-lg border bg-card"
      >
        {choices.map((choice) => {
          const amount = amountForInstallments(priceCents, installments, reserved, choice);
          const itemId = `installments-${choice}`;
          return (
            <Label
              key={choice}
              htmlFor={itemId}
              className="flex min-h-16 cursor-pointer items-center gap-4 px-4 py-3 font-normal first:rounded-t-lg last:rounded-b-lg has-data-[state=checked]:bg-amber/10"
            >
              <RadioGroupItem id={itemId} value={String(choice)} className="size-5" />
              <span className="flex-1 text-base">
                {installments === 1 ? "Todo el paquete" : `${choice} cuota${choice === 1 ? "" : "s"}`}
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-base font-semibold">{formatEur(amount)}</span>
                {eurToVes ? (
                  <span className="block text-xs text-muted-foreground">{formatVes(amount, eurToVes)}</span>
                ) : null}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      {eurToVes ? (
        <p className="text-sm text-muted-foreground">
          Los bolívares son a la tasa del día. Si pagas en bolívares, paga el monto de hoy.
        </p>
      ) : null}

      <PayBottomBar totalCents={total} eurToVes={eurToVes} count={count} installments={installments}>
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          disabled={!count}
          onClick={() => count && router.push(PLANS_PATHS.pay(planId, { step: "metodo", count }))}
        >
          Continuar
        </Button>
      </PayBottomBar>
    </>
  );
}
