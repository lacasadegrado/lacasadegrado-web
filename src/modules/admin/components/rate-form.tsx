"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { refreshRateAction, setManualRateAction } from "../lib/actions/rate.action";
import type { ActionState } from "../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

export function RateForm() {
  const [formKey, setFormKey] = useState(0);
  const [manualState, manualAction, manualPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await setManualRateAction(previous, formData);
      if (result.status === "success") setFormKey((key) => key + 1);
      return result;
    },
    IDLE,
  );
  const [refreshState, refreshAction, refreshPending] = useActionState(
    () => refreshRateAction(),
    IDLE,
  );

  const feedback = [manualState, refreshState].find((s) => s.status !== "idle");

  return (
    <div className="space-y-5">
      <form action={refreshAction}>
        <Button type="submit" disabled={refreshPending || manualPending}>
          {refreshPending ? "Consultando DolarApi…" : "Actualizar desde DolarApi (BCV oficial)"}
        </Button>
      </form>

      <form key={formKey} action={manualAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="usdToVes">O fija la tasa a mano (Bs por USD)</Label>
          <div className="flex gap-2">
            <Input
              id="usdToVes"
              name="usdToVes"
              type="text"
              inputMode="decimal"
              placeholder="813,74"
              required
              className="max-w-48 tabular-nums"
            />
            <Button type="submit" variant="outline" disabled={manualPending || refreshPending}>
              {manualPending ? "Guardando…" : "Fijar tasa"}
            </Button>
          </div>
        </div>
      </form>

      {feedback ? (
        <Alert role={feedback.status === "error" ? "alert" : "status"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
