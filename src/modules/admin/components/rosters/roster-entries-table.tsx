"use client";

import { Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import type { RosterColumn } from "@/modules/forms/lib/schemas/roster.schema";
import { rosterNameKey } from "@/modules/forms/lib/utils/roster.util";

import { deleteRosterEntryAction } from "../../lib/actions/roster.action";
import type { AdminRosterEntry } from "../../lib/types/roster.types";

type Filter = "all" | "answered" | "pending";

/** Everyone on the list with their columns, who already answered, and a search. */
export function RosterEntriesTable({ columns, entries }: { columns: RosterColumn[]; entries: AdminRosterEntry[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const words = rosterNameKey(query).split(" ").filter(Boolean);
  const visible = entries.filter((entry) => {
    if (filter === "answered" && !entry.answeredAt) return false;
    if (filter === "pending" && entry.answeredAt) return false;
    const haystack = rosterNameKey([entry.name, ...Object.values(entry.values)].join(" "));
    return words.every((word) => haystack.includes(word));
  });
  const answered = entries.filter((entry) => entry.answeredAt).length;

  function remove(entry: AdminRosterEntry) {
    if (!window.confirm(`¿Quitar a ${entry.name} del listado? Sus respuestas se conservan.`)) return;
    startTransition(async () => {
      const result = await deleteRosterEntryAction({ entryId: entry.id });
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o dato"
            aria-label="Buscar en el listado"
            className="pl-8"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="Filtrar por respuesta">
          {(
            [
              ["all", `Todos (${entries.length})`],
              ["answered", `Respondieron (${answered})`],
              ["pending", `Sin responder (${entries.length - answered})`],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key} className="whitespace-nowrap">
                  {column.label}
                </TableHead>
              ))}
              <TableHead>Respondió</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 3} className="py-6 text-center text-muted-foreground">
                  Nadie coincide con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium whitespace-nowrap">{entry.name}</TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key} className="max-w-56 truncate" title={entry.values[column.key]}>
                      {entry.values[column.key] || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap">
                    {entry.answeredAt ? (
                      <Badge>{formatDateTime(entry.answeredAt)}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Todavía no</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => remove(entry)}
                      aria-label={`Quitar a ${entry.name} del listado`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
