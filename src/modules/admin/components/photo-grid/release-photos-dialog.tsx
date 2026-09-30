"use client";

import { Unlock } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";

import { bulkReleasePhotosAction } from "../../lib/actions/photo.action";
import type { BulkActionOutcome } from "../../lib/types/admin.types";

type ReleasePhotosDialogProps = {
  selectedIds: string[];
  /** Every email tagged on at least one selected photo. */
  selectedEmails: string[];
  pending: boolean;
  run: (action: () => Promise<BulkActionOutcome>, close: () => void) => void;
};

/**
 * Releases the selected photos as package photos: people see them clean
 * and download them without buying. For everyone tagged on each photo,
 * or only for chosen people (e.g. a group photo where one person paid).
 */
export function ReleasePhotosDialog({ selectedIds, selectedEmails, pending, run }: ReleasePhotosDialogProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "emails">("all");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const count = selectedIds.length;
  // Only emails still tagged on the current selection can be chosen.
  const chosenEmails = selectedEmails.filter((email) => chosen.has(email));

  function toggle(email: string, checked: boolean) {
    setChosen((current) => {
      const next = new Set(current);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setMode("all");
          setChosen(new Set());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={pending}>
          <Unlock aria-hidden="true" /> Liberar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Liberar {count} foto{count === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Para las fotos del paquete: quien las reciba las ve sin marca de agua y las descarga sin
            comprarlas. El resto de sus fotos sigue a la venta.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as "all" | "emails")} className="gap-3">
          <div className="flex items-start gap-2">
            <RadioGroupItem id={`${id}-all`} value="all" className="mt-0.5" />
            <Label htmlFor={`${id}-all`} className="block font-normal">
              <span className="font-medium">Para todos los etiquetados</span>
              <span className="block text-sm text-muted-foreground">
                Incluye a quien etiquetes después en estas fotos.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem id={`${id}-emails`} value="emails" className="mt-0.5" />
            <Label htmlFor={`${id}-emails`} className="block font-normal">
              <span className="font-medium">Solo para estos correos</span>
              <span className="block text-sm text-muted-foreground">
                Para fotos grupales donde solo algunos pagaron el paquete.
              </span>
            </Label>
          </div>
        </RadioGroup>

        {mode === "emails" ? (
          selectedEmails.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Las fotos seleccionadas todavía no tienen correos. Etiquétalas primero.
            </p>
          ) : (
            <fieldset className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              <legend className="sr-only">Correos que reciben las fotos</legend>
              {selectedEmails.map((email, index) => (
                <div key={email} className="flex items-center gap-2">
                  <Checkbox
                    id={`${id}-email-${index}`}
                    checked={chosen.has(email)}
                    onCheckedChange={(checked) => toggle(email, checked === true)}
                  />
                  <Label htmlFor={`${id}-email-${index}`} className="min-w-0 truncate font-normal">
                    {email}
                  </Label>
                </div>
              ))}
            </fieldset>
          )
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending || (mode === "emails" && chosenEmails.length === 0)}
            onClick={() =>
              run(
                () =>
                  mode === "all"
                    ? bulkReleasePhotosAction({ mode: "all", photoIds: selectedIds })
                    : bulkReleasePhotosAction({ mode: "emails", photoIds: selectedIds, emails: chosenEmails }),
                () => setOpen(false),
              )
            }
          >
            {pending ? "Liberando…" : "Liberar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
