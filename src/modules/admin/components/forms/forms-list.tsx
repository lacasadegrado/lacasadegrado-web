"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CopyButton } from "@/common/components/copy-button/copy-button";
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
import { formatDateTime } from "@/common/lib/utils/date.util";
import { publicFormUrl } from "@/modules/forms/lib/utils/form-url.util";

import { deleteFormAction, type FormActionOutcome } from "../../lib/actions/form.action";
import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import type { AdminFormSummary } from "../../lib/types/form-admin.types";
import { FormStatusBadge } from "./form-status-badge";

export function FormsList({ eventId, forms }: { eventId: string; forms: AdminFormSummary[] }) {
  const [outcome, setOutcome] = useState<FormActionOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  if (forms.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Este evento todavía no tiene formularios.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {forms.map((form) => (
          <li key={form.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={ADMIN_PATHS.formBuilder(form.id)}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {form.title}
                </Link>
                <FormStatusBadge status={form.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {form.submissionCount === 1 ? "1 respuesta" : `${form.submissionCount} respuestas`} ·
                editado {formatDateTime(form.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton
                text={publicFormUrl(form.slug)}
                label="Copiar link"
                copiedLabel="Copiado"
                ariaLabel={`Copiar el link de ${form.title}`}
                variant="outline"
                size="sm"
              />
              <Button asChild size="sm" variant="outline">
                <Link href={ADMIN_PATHS.formBuilder(form.id)}>Editar</Link>
              </Button>
              {form.submissionCount > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`${ADMIN_PATHS.packagePayments}?event=${eventId}&form=${form.id}`}>
                    Ver respuestas
                  </Link>
                </Button>
              ) : null}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending || form.submissionCount > 0}
                    aria-label={`Eliminar ${form.title}`}
                    title={
                      form.submissionCount > 0
                        ? "Ya tiene respuestas. Ciérralo en vez de borrarlo."
                        : "Eliminar formulario"
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar «{form.title}»?</AlertDialogTitle>
                    <AlertDialogDescription>
                      No tiene respuestas. Su link deja de funcionar y no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => setOutcome(await deleteFormAction({ formId: form.id })))
                      }
                    >
                      Sí, eliminar
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
      {outcome ? (
        <p role={outcome.ok ? "status" : "alert"} className="text-sm font-medium">
          {outcome.message}
        </p>
      ) : null}
    </div>
  );
}

