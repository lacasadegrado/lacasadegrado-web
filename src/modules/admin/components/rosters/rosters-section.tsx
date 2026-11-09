import Link from "next/link";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { formatDateTime } from "@/common/lib/utils/date.util";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import type { AdminRosterSummary } from "../../lib/types/roster.types";
import { RosterImportDialog } from "./roster-import-dialog";

/** Eventos › Formularios: the event's people lists, to prefill its forms. */
export function RostersSection({ eventId, rosters }: { eventId: string; rosters: AdminRosterSummary[] }) {
  return (
    <section aria-labelledby="rosters-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="rosters-heading" className="text-lg font-semibold">
            Listados de personas
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Graduandos, tutores o coordinadores con sus datos (carrera, talla, monto pagado…). Un
            formulario enlazado a un listado deja que cada persona busque su nombre y vea sus datos ya
            llenos para confirmarlos o corregirlos.
          </p>
        </div>
        <RosterImportDialog eventId={eventId} />
      </div>

      {rosters.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Este evento todavía no tiene listados. Importa un Excel o CSV con una fila por persona.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rosters.map((roster) => (
            <li key={roster.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{roster.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {roster.entryCount} persona{roster.entryCount === 1 ? "" : "s"} · actualizado el{" "}
                    {formatDateTime(roster.updatedAt)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={ADMIN_PATHS.roster(roster.id)}>Ver</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roster.columns.slice(0, 8).map((column) => (
                  <Badge key={column.key} variant="secondary" className="font-normal">
                    {column.label}
                  </Badge>
                ))}
                {roster.columns.length > 8 ? (
                  <Badge variant="outline" className="font-normal">
                    +{roster.columns.length - 8}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {roster.formCount === 0
                  ? "Ningún formulario lo usa todavía: enlázalo desde el editor del formulario."
                  : `Lo usa${roster.formCount === 1 ? " 1 formulario" : `n ${roster.formCount} formularios`}.`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
