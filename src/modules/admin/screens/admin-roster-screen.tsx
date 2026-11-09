import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDateTime } from "@/common/lib/utils/date.util";

import { RosterActions } from "../components/rosters/roster-actions";
import { RosterEntriesTable } from "../components/rosters/roster-entries-table";
import { RosterImportDialog } from "../components/rosters/roster-import-dialog";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { getRoster } from "../lib/services/roster.service";

/** Eventos › Formularios › one list: everyone, who answered, and updates from a file. */
export async function AdminRosterScreen({ rosterId }: { rosterId: string }) {
  const roster = await getRoster(rosterId);
  if (!roster) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={ADMIN_PATHS.eventFormsFor(roster.eventId)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Formularios de {roster.eventName}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{roster.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {roster.entries.length} persona{roster.entries.length === 1 ? "" : "s"} · actualizado el{" "}
              {formatDateTime(roster.updatedAt)}
              {roster.sourceName ? ` desde ${roster.sourceName}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {roster.forms.length === 0 ? (
                "Ningún formulario lo usa todavía. Enlázalo desde el editor de un formulario de este evento."
              ) : (
                <>
                  Lo usa:{" "}
                  {roster.forms.map((form, index) => (
                    <span key={form.id}>
                      {index > 0 ? ", " : ""}
                      <Link href={ADMIN_PATHS.formBuilder(form.id)} className="underline underline-offset-4">
                        {form.title}
                      </Link>
                    </span>
                  ))}
                </>
              )}
            </p>
          </div>
          <RosterImportDialog eventId={roster.eventId} roster={{ id: roster.id, name: roster.name }} />
        </div>
        <RosterActions rosterId={roster.id} name={roster.name} formCount={roster.forms.length} />
      </div>

      <RosterEntriesTable columns={roster.columns} entries={roster.entries} />
    </div>
  );
}
