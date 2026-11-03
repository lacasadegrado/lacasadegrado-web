"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { cn } from "@/common/lib/utils/cn.util";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import { DASHBOARD_RANGES, type DashboardRange } from "../../lib/constants/dashboard.constants";

type DashboardFiltersProps = {
  range: DashboardRange;
  eventId?: string;
  events: { id: string; name: string }[];
  /** The dashboard's figures; dimmed while new ones load. */
  children: ReactNode;
};

/**
 * Range and event live in the query string, so a view can be bookmarked.
 * The selects change at once (local state) and the figures dim with an
 * "Actualizando…" status while the server computes the new ones.
 */
export function DashboardFilters({ range, eventId, events, children }: DashboardFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState({ range, event: eventId ?? "" });

  function go(next: Partial<typeof selected>) {
    const value = { ...selected, ...next };
    setSelected(value);
    const params = new URLSearchParams();
    if (value.range !== "30d") params.set("range", value.range);
    if (value.event) params.set("event", value.event);
    const query = params.toString();
    startTransition(() => router.push(query ? `${ADMIN_PATHS.root}?${query}` : ADMIN_PATHS.root, { scroll: false }));
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-range">Período</Label>
          <NativeSelect
            id="dashboard-range"
            value={selected.range}
            onChange={(event) => go({ range: event.target.value as DashboardRange })}
          >
            {DASHBOARD_RANGES.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-event">Evento</Label>
          <NativeSelect
            id="dashboard-event"
            value={selected.event}
            onChange={(event) => go({ event: event.target.value })}
          >
            <NativeSelectOption value="">Todos los eventos</NativeSelectOption>
            {events.map((event) => (
              <NativeSelectOption key={event.id} value={event.id}>
                {event.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <p role="status" className="flex h-9 items-center gap-1.5 text-sm text-muted-foreground">
          {pending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              Actualizando…
            </>
          ) : null}
        </p>
      </div>
      <div
        aria-busy={pending || undefined}
        className={cn("space-y-10 transition-opacity motion-reduce:transition-none", pending && "pointer-events-none opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
