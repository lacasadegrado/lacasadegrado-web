"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

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
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatEur } from "@/common/lib/utils/money.util";

import {
  deletePackageAction,
  setPackageActiveAction,
  type PackageActionOutcome,
} from "../../lib/actions/package.action";
import type { AdminPackage } from "../../lib/types/form-admin.types";
import { PackageDialog } from "./package-dialog";

export function PackagesTable({ packages }: { packages: AdminPackage[] }) {
  const [outcome, setOutcome] = useState<PackageActionOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<PackageActionOutcome>) {
    startTransition(async () => setOutcome(await action()));
  }

  if (packages.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Este evento todavía no tiene paquetes. Agrega al menos uno para poder abrir un formulario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paquete</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Respuestas</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id} className={pkg.isActive ? undefined : "text-muted-foreground"}>
                <TableCell className="max-w-sm whitespace-normal">
                  <p className="font-medium">{pkg.name}</p>
                  {pkg.description ? (
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatEur(pkg.priceCents)}</TableCell>
                <TableCell>
                  <Badge variant={pkg.isActive ? "secondary" : "outline"}>
                    {pkg.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{pkg.submissionCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => setPackageActiveAction({ packageId: pkg.id, isActive: !pkg.isActive }))
                      }
                    >
                      {pkg.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <PackageDialog mode="edit" pkg={pkg} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending || pkg.submissionCount > 0}
                          aria-label={`Eliminar ${pkg.name}`}
                          title={
                            pkg.submissionCount > 0
                              ? "Ya tiene respuestas. Desactívalo en vez de borrarlo."
                              : "Eliminar paquete"
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar «{pkg.name}»?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Nadie lo ha elegido todavía, así que no afecta a ninguna respuesta. Sale
                            de la lista de todos los formularios del evento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                          <Button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => deletePackageAction({ packageId: pkg.id }))}
                          >
                            Sí, eliminar
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {outcome ? (
        <p role={outcome.ok ? "status" : "alert"} className="text-sm font-medium">
          {outcome.message}
        </p>
      ) : null}
    </div>
  );
}
