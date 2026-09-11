"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";

import { bulkTagAction } from "../lib/actions/photo.action";
import type { BulkTagState } from "../lib/types/admin.types";

const IDLE: BulkTagState = { status: "idle" };

export function BulkTagForm({ eventId }: { eventId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: BulkTagState, formData: FormData) => {
      const result = await bulkTagAction(previous, formData);
      if (result.status === "success") setFormKey((key) => key + 1);
      return result;
    },
    IDLE,
  );

  return (
    <div className="space-y-4">
      <form key={formKey} action={action} className="space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="space-y-2">
          <Label htmlFor="bulk-csv">Una línea por foto: archivo,correo</Label>
          <Textarea
            id="bulk-csv"
            name="csv"
            rows={6}
            required
            spellCheck={false}
            placeholder={"IMG_0412.jpg,ana@correo.com\nIMG_0412.jpg,papa.de.ana@correo.com\nIMG_0413.jpg,luis@correo.com"}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            El nombre de archivo se compara sin importar mayúsculas ni extensión. La
            misma foto puede llevar varios correos.
          </p>
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Etiquetando…" : "Etiquetar en lote"}
        </Button>
      </form>

      {state.status === "error" ? (
        <Alert role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "success" ? (
        <Alert role="status">
          <AlertTitle>
            {state.result.added} etiqueta{state.result.added === 1 ? "" : "s"} nueva
            {state.result.added === 1 ? "" : "s"}
            {state.result.alreadyTagged > 0
              ? `, ${state.result.alreadyTagged} ya existían`
              : ""}
          </AlertTitle>
          {state.result.unmatchedFilenames.length > 0 ? (
            <AlertDescription>
              <p>No encontramos estos archivos en el evento:</p>
              <ul className="mt-1 list-disc pl-5 font-mono text-xs">
                {state.result.unmatchedFilenames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </AlertDescription>
          ) : null}
          {state.result.invalidLines.length > 0 ? (
            <AlertDescription>
              <p>Líneas con problemas:</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {state.result.invalidLines.map((line) => (
                  <li key={line.line}>
                    Línea {line.line}: {line.reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
