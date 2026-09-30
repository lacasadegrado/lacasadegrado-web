"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { formatEur } from "@/common/lib/utils/money.util";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";

type Option = { id: string; label: string };

type PackagePaymentsFiltersProps = {
  events: Option[];
  forms: Option[];
  packages: { id: string; name: string; priceCents: number }[];
  current: { event?: string; form?: string; package?: string; q?: string };
};

/** Builds the list URL; changing any filter goes back to page 1. */
function listUrl(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${ADMIN_PATHS.packagePayments}?${query}` : ADMIN_PATHS.packagePayments;
}

export function PackagePaymentsFilters({ events, forms, packages, current }: PackagePaymentsFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(current.q ?? "");

  function go(next: Partial<typeof current>) {
    router.push(listUrl({ ...current, ...next }));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-event">Evento</Label>
        <NativeSelect
          id="filter-event"
          value={current.event ?? ""}
          // Forms and packages belong to the event, so they reset with it.
          onChange={(event) => go({ event: event.target.value || undefined, form: undefined, package: undefined })}
        >
          <NativeSelectOption value="">Todos los eventos</NativeSelectOption>
          {events.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-form">Formulario</Label>
        <NativeSelect
          id="filter-form"
          value={current.form ?? ""}
          disabled={!current.event}
          onChange={(event) => go({ form: event.target.value || undefined })}
        >
          <NativeSelectOption value="">{current.event ? "Todos los formularios" : "Elige un evento"}</NativeSelectOption>
          {forms.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-package">Paquete</Label>
        <NativeSelect
          id="filter-package"
          value={current.package ?? ""}
          disabled={!current.event}
          onChange={(event) => go({ package: event.target.value || undefined })}
        >
          <NativeSelectOption value="">{current.event ? "Todos los paquetes" : "Elige un evento"}</NativeSelectOption>
          {packages.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.name} · {formatEur(option.priceCents)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <form
        role="search"
        className="space-y-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: query.trim() || undefined });
        }}
      >
        <Label htmlFor="filter-q">Correo o referencia</Label>
        <div className="flex gap-2">
          <Input
            id="filter-q"
            type="search"
            value={query}
            maxLength={100}
            placeholder="ana@correo.com"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
