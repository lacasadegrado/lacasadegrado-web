"use client";

import { Mail, Tag, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/common/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";

import {
  bulkDeletePhotosAction,
  bulkTagPhotosAction,
  bulkUpdatePriceAction,
} from "../../lib/actions/photo.action";
import type { BulkActionOutcome } from "../../lib/types/admin.types";

type BulkActionsBarProps = {
  selectedIds: string[];
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
};

/**
 * Appears as soon as one photo is selected: count, select-all, clear, and
 * the three bulk actions, each behind a dialog. The outcome message stays
 * visible after the selection is cleared so the admin can read it.
 */
export function BulkActionsBar({ selectedIds, total, onSelectAll, onClear }: BulkActionsBarProps) {
  const [outcome, setOutcome] = useState<BulkActionOutcome | null>(null);
  const [pending, startTransition] = useTransition();
  const [tagOpen, setTagOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [priceEur, setPriceEur] = useState("5.00");
  const [printPriceEur, setPrintPriceEur] = useState("7.00");
  const count = selectedIds.length;

  function run(action: () => Promise<BulkActionOutcome>, close: () => void) {
    startTransition(async () => {
      const result = await action();
      setOutcome(result);
      if (result.ok) {
        close();
        onClear();
      }
    });
  }

  return (
    <div className="space-y-3">
      {count > 0 ? (
        <div
          role="toolbar"
          aria-label="Acciones sobre las fotos seleccionadas"
          className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 pl-3 shadow-[0_2px_12px_rgba(19,80,101,0.12)]"
        >
          <span className="text-sm font-semibold tabular-nums">
            {count} de {total} seleccionada{count === 1 ? "" : "s"}
          </span>
          <Button type="button" variant="link" size="sm" className="h-8 px-1" onClick={onSelectAll} disabled={count === total}>
            Seleccionar todas
          </Button>
          <Button type="button" variant="link" size="sm" className="h-8 px-1" onClick={onClear}>
            Limpiar
          </Button>

          <div className="ml-auto flex flex-wrap gap-2">
            <Dialog open={tagOpen} onOpenChange={setTagOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" disabled={pending}>
                  <Mail aria-hidden="true" /> Etiquetar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Etiquetar {count} foto{count === 1 ? "" : "s"}</DialogTitle>
                  <DialogDescription>
                    Cada correo se asocia a todas las fotos seleccionadas. Separa varios con
                    comas o saltos de línea.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="bulk-emails">Correos</Label>
                  <Textarea
                    id="bulk-emails"
                    rows={4}
                    value={emails}
                    onChange={(event) => setEmails(event.target.value)}
                    placeholder={"ana@correo.com\npapa.de.ana@correo.com"}
                    spellCheck={false}
                    autoCapitalize="off"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTagOpen(false)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={pending || emails.trim().length < 3}
                    onClick={() =>
                      run(
                        () => bulkTagPhotosAction({ photoIds: selectedIds, emails }),
                        () => {
                          setTagOpen(false);
                          setEmails("");
                        },
                      )
                    }
                  >
                    {pending ? "Etiquetando…" : "Etiquetar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={pending}>
                  <Tag aria-hidden="true" /> Precio
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Precios para {count} foto{count === 1 ? "" : "s"}</DialogTitle>
                  <DialogDescription>
                    Solo aplica a pedidos futuros. Los pedidos ya creados conservan su precio.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-price">Digital (EUR)</Label>
                    <Input
                      id="bulk-price"
                      inputMode="decimal"
                      value={priceEur}
                      onChange={(event) => setPriceEur(event.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-print-price">Impresa (EUR)</Label>
                    <Input
                      id="bulk-print-price"
                      inputMode="decimal"
                      value={printPriceEur}
                      onChange={(event) => setPrintPriceEur(event.target.value)}
                      className="tabular-nums"
                    />
                    <p className="text-xs text-muted-foreground">Incluye la digital.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPriceOpen(false)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => bulkUpdatePriceAction({ photoIds: selectedIds, priceEur, printPriceEur }),
                        () => setPriceOpen(false),
                      )
                    }
                  >
                    {pending ? "Guardando…" : "Aplicar precios"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={pending}>
                  <Trash2 aria-hidden="true" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar {count} foto{count === 1 ? "" : "s"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borran los originales y sus vistas previas del almacenamiento. Las fotos que
                    ya estén en un pedido se conservan y te las listamos. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={pending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => bulkDeletePhotosAction({ photoIds: selectedIds }),
                        () => setDeleteOpen(false),
                      )
                    }
                  >
                    {pending ? "Eliminando…" : "Sí, eliminar"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      {outcome ? (
        <Alert role={outcome.ok ? "status" : "alert"}>
          <AlertTitle>{outcome.message}</AlertTitle>
          {outcome.ok && outcome.result.blocked.length > 0 ? (
            <AlertDescription>
              <ul className="list-disc pl-5 font-mono text-xs">
                {outcome.result.blocked.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </AlertDescription>
          ) : null}
          {outcome.ok && outcome.result.invalid.length > 0 ? (
            <AlertDescription>
              Correos ignorados por no ser válidos: {outcome.result.invalid.join(", ")}
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
