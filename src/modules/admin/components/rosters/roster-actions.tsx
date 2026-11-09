"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";

import { deleteRosterAction, renameRosterAction } from "../../lib/actions/roster.action";
import { ADMIN_PATHS } from "../../lib/constants/admin.constants";

/** Rename and delete for a list's page. */
export function RosterActions({ rosterId, name, formCount }: { rosterId: string; name: string; formCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameRosterAction({ rosterId, name: value });
      setMessage(result.message);
      if (result.ok) setEditing(false);
    });
  }

  function remove() {
    const warning =
      formCount > 0
        ? `¿Eliminar el listado? ${formCount === 1 ? "El formulario que lo usa dejará" : `Los ${formCount} formularios que lo usan dejarán`} de rellenar datos; las respuestas recibidas se conservan.`
        : "¿Eliminar el listado? No se puede deshacer.";
    if (!window.confirm(warning)) return;
    startTransition(async () => {
      const result = await deleteRosterAction({ rosterId });
      if (result.ok && result.eventId) router.push(ADMIN_PATHS.eventFormsFor(result.eventId));
      else setMessage(result.message);
    });
  }

  return (
    <div className="space-y-2">
      {editing ? (
        <form onSubmit={rename} className="flex flex-wrap gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Nombre del listado"
            className="max-w-xs"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={pending}>
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Cambiar nombre
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={remove}>
            <Trash2 aria-hidden="true" /> Eliminar listado
          </Button>
        </div>
      )}
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
