"use client";

import { useActionState, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";

import { tagPhotoAction } from "../../lib/actions/photo.action";
import type { ActionState } from "../../lib/types/admin.types";

const IDLE: ActionState = { status: "idle" };

export function TagForm({ photoId }: { photoId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await tagPhotoAction(previous, formData);
      if (result.status === "success") setFormKey((key) => key + 1);
      return result;
    },
    IDLE,
  );

  return (
    <form key={formKey} action={action} className="space-y-1.5">
      <input type="hidden" name="photoId" value={photoId} />
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="correo@estudiante.com"
          aria-label="Correo para etiquetar"
          required
          className="h-8 text-sm"
          aria-invalid={state.status === "error" || undefined}
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "…" : "Etiquetar"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="text-xs font-medium">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
