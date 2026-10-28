"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/common/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { cn } from "@/common/lib/utils/cn.util";

type SearchableSelectProps = {
  id: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
};

/** "García" and "garcia" match: accents and case do not matter when searching names. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Every word typed must appear in the option, in any order: "melo christian" finds "Christian Mauricio Melo García". */
function matches(option: string, search: string): number {
  const haystack = fold(option);
  return fold(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
    ? 1
    : 0;
}

/**
 * A list question with many options (a whole class of names): a button
 * that opens a search box over the list. Short lists keep the native
 * select; see SEARCHABLE_SELECT_THRESHOLD.
 */
export function SearchableSelect({ id, options, value, onChange, describedBy, invalid }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn("h-auto min-h-9 w-full justify-between py-2 text-left font-normal", !value && "text-muted-foreground")}
        >
          <span className="min-w-0 whitespace-normal">{value || "Busca y elige…"}</span>
          <ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command filter={(option, search) => matches(option, search)}>
          <CommandInput placeholder="Escribe para buscar…" />
          <CommandList>
            <CommandEmpty>No aparece en la lista.</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  onChange(option === value ? "" : option);
                  setOpen(false);
                }}
              >
                <Check aria-hidden="true" className={cn("size-4", option === value ? "opacity-100" : "opacity-0")} />
                {option}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
