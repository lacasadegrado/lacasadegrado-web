"use client";

import { useActionState, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";

import { updatePhotoPriceAction } from "../../lib/actions/photo.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

type PhotoPriceFormProps = {
  photoId: string;
  priceCents: number;
  printPriceCents: number;
};

function toInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Inline editor for both prices. Only affects orders created after saving. */
export function PhotoPriceForm({ photoId, priceCents, printPriceCents }: PhotoPriceFormProps) {
  const initialDigital = toInput(priceCents);
  const initialPrint = toInput(printPriceCents);
  const [digital, setDigital] = useState(initialDigital);
  const [print, setPrint] = useState(initialPrint);
  const [state, action, pending] = useActionState(updatePhotoPriceAction, IDLE);
  const dirty =
    digital.replace(",", ".") !== initialDigital || print.replace(",", ".") !== initialPrint;

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="photoId" value={photoId} />
      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Digital</span>
          <Input
            name="priceEur"
            type="text"
            inputMode="decimal"
            value={digital}
            onChange={(event) => setDigital(event.target.value)}
            aria-label="Precio digital en euros"
            aria-invalid={state.status === "error" || undefined}
            className="h-8 px-2 text-sm tabular-nums"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Impresa</span>
          <Input
            name="printPriceEur"
            type="text"
            inputMode="decimal"
            value={print}
            onChange={(event) => setPrint(event.target.value)}
            aria-label="Precio impresa en euros"
            aria-invalid={state.status === "error" || undefined}
            className="h-8 px-2 text-sm tabular-nums"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant={dirty ? "default" : "ghost"} disabled={pending || !dirty}>
          {pending ? "…" : "Guardar precios"}
        </Button>
        {state.status === "error" ? (
          <span role="alert" className="text-xs font-medium">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
