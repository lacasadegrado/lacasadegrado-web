"use client";

import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/common/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { cn } from "@/common/lib/utils/cn.util";

import type { RosterPerson } from "../../lib/types/public-form.types";
import { rosterNameKey } from "../../lib/utils/roster.util";

export type RosterIdentity = { kind: "listed"; entryId: string; name: string } | { kind: "not_listed" };

type RosterPickerProps = {
  people: RosterPerson[];
  identity: RosterIdentity | null;
  loading: boolean;
  error: string | null;
  onPick: (identity: RosterIdentity | null) => void;
};

/** Every word typed must appear in the name or its hint: "melo christian" finds "Christian Mauricio Melo García". */
function matches(keywords: string[] | undefined, search: string): number {
  const haystack = rosterNameKey((keywords ?? []).join(" "));
  return rosterNameKey(search)
    .split(" ")
    .filter(Boolean)
    .every((word) => haystack.includes(word))
    ? 1
    : 0;
}

/**
 * First step of a form with a people list: the person finds their name
 * (accents and order don't matter) and the form fills in what the list
 * knows. "No estoy en la lista" opens the form empty.
 */
export function RosterPicker({ people, identity, loading, error, onPick }: RosterPickerProps) {
  const [open, setOpen] = useState(false);

  if (identity) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <UserRound aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <p role="status">
            {identity.kind === "listed" ? (
              <>
                Respondes como <strong>{identity.name}</strong>
                {loading ? <span className="text-muted-foreground"> · cargando tus datos…</span> : null}
              </>
            ) : (
              "No estás en la lista: llena tus datos abajo."
            )}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onPick(null)}>
          Cambiar
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="roster-picker-title" className="space-y-3 rounded-lg border bg-card p-5">
      <div>
        <h2 id="roster-picker-title" className="text-xl">
          Busca tu nombre
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Te mostramos los datos que ya tenemos tuyos para que los confirmes, corrijas lo que esté mal y
          completes lo que falte.
        </p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="field-roster"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error) || undefined}
            className="h-auto min-h-11 w-full justify-between py-2 text-left font-normal text-muted-foreground"
          >
            Escribe tu nombre y apellido…
            <ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command filter={(_value, search, keywords) => matches(keywords, search)}>
            <CommandInput placeholder="Escribe para buscar…" />
            <CommandList>
              <CommandEmpty>No aparece. Revisa cómo lo escribiste o usa «No estoy en la lista».</CommandEmpty>
              {people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  keywords={[person.name, person.hint ?? ""]}
                  onSelect={() => {
                    setOpen(false);
                    onPick({ kind: "listed", entryId: person.id, name: person.name });
                  }}
                >
                  <Check aria-hidden="true" className={cn("size-4 opacity-0")} />
                  <span>
                    {person.name}
                    {person.hint ? <span className="text-muted-foreground"> · {person.hint}</span> : null}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" variant="link" className="h-auto p-0" onClick={() => onPick({ kind: "not_listed" })}>
        No estoy en la lista
      </Button>
    </section>
  );
}
