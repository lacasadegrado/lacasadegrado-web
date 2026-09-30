"use client";

import { ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";

import { CopyButton } from "@/common/components/copy-button/copy-button";
import { Button } from "@/common/components/ui/button";
import type { FormStatus } from "@/common/lib/db/schema";
import { FORMS_PATHS } from "@/modules/forms/lib/constants/forms.constants";
import { publicFormUrl } from "@/modules/forms/lib/utils/form-url.util";

import { setFormStatusAction, type FormActionOutcome } from "../../../lib/actions/form.action";
import { FormStatusBadge } from "../form-status-badge";

type FormStatusControlsProps = {
  formId: string;
  slug: string;
  status: FormStatus;
  activePackageCount: number;
  /** Unsaved builder changes: people would see the saved version, so save first. */
  dirty: boolean;
};

const STATUS_HINT: Record<FormStatus, string> = {
  draft: "Borrador: el link existe pero todavía no recibe respuestas.",
  open: "Abierto: cualquiera con el link puede enviar respuestas.",
  closed: "Cerrado: el link avisa que ya no recibe respuestas.",
};

export function FormStatusControls({ formId, slug, status, activePackageCount, dirty }: FormStatusControlsProps) {
  const [outcome, setOutcome] = useState<FormActionOutcome | null>(null);
  const [pending, startTransition] = useTransition();
  const url = publicFormUrl(slug);
  const next: FormStatus = status === "open" ? "closed" : "open";
  const blockedByPackages = next === "open" && activePackageCount === 0;

  return (
    <section aria-label="Estado y link" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <FormStatusBadge status={status} />
          <p className="text-sm text-muted-foreground">{STATUS_HINT[status]}</p>
        </div>
        <Button
          type="button"
          variant={next === "open" ? "default" : "outline"}
          disabled={pending || dirty || blockedByPackages}
          onClick={() =>
            startTransition(async () => setOutcome(await setFormStatusAction({ formId, status: next })))
          }
        >
          {pending
            ? "Guardando…"
            : next === "open"
              ? status === "draft"
                ? "Abrir formulario"
                : "Reabrir formulario"
              : "Cerrar formulario"}
        </Button>
      </div>

      {blockedByPackages ? (
        <p className="text-sm font-medium">
          Para abrirlo, el evento necesita al menos un paquete activo.
        </p>
      ) : dirty ? (
        <p className="text-sm font-medium">Guarda los cambios antes de cambiar el estado.</p>
      ) : null}
      {outcome ? (
        <p role={outcome.ok ? "status" : "alert"} className="text-sm font-medium">
          {outcome.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">{url}</code>
        <CopyButton text={url} label="Copiar link" copiedLabel="Copiado" variant="outline" size="sm" />
        <Button asChild variant="outline" size="sm">
          <a href={FORMS_PATHS.public(slug)} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" /> Abrir
          </a>
        </Button>
      </div>
    </section>
  );
}
