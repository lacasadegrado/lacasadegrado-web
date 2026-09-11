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
};

/** Inline price editor. Only affects orders created after saving. */
export function PhotoPriceForm({ photoId, priceCents }: PhotoPriceFormProps) {
  const initial = (priceCents / 100).toFixed(2);
  const [value, setValue] = useState(initial);
  const [state, action, pending] = useActionState(updatePhotoPriceAction, IDLE);
  const dirty = value.replace(",", ".") !== initial;

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="photoId" value={photoId} />
      <span className="text-xs text-muted-foreground">USD</span>
      <Input
        name="priceUsd"
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Precio en dólares"
        aria-invalid={state.status === "error" || undefined}
        className="h-8 w-20 px-2 text-sm tabular-nums"
      />
      <Button type="submit" size="sm" variant={dirty ? "default" : "ghost"} disabled={pending || !dirty}>
        {pending ? "…" : "Guardar"}
      </Button>
      {state.status === "error" ? (
        <span role="alert" className="text-xs font-medium">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
