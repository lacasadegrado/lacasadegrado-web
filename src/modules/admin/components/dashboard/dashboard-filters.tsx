"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import { DASHBOARD_RANGES, type DashboardRange } from "../../lib/constants/dashboard.constants";

type DashboardFiltersProps = {
  range: DashboardRange;
  eventId?: string;
  events: { id: string; name: string }[];
};

/** Range and event live in the query string, so a view can be bookmarked. */
export function DashboardFilters({ range, eventId, events }: DashboardFiltersProps) {
  const router = useRouter();

  function go(next: { range?: DashboardRange; event?: string }) {
    const params = new URLSearchParams();
    const nextRange = next.range ?? range;
    const nextEvent = "event" in next ? next.event : eventId;
    if (nextRange !== "30d") params.set("range", nextRange);
    if (nextEvent) params.set("event", nextEvent);
    const query = params.toString();
    router.push(query ? `${ADMIN_PATHS.root}?${query}` : ADMIN_PATHS.root);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="dashboard-range">Período</Label>
        <NativeSelect
          id="dashboard-range"
          value={range}
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
          value={eventId ?? ""}
          onChange={(event) => go({ event: event.target.value || undefined })}
        >
          <NativeSelectOption value="">Todos los eventos</NativeSelectOption>
          {events.map((event) => (
            <NativeSelectOption key={event.id} value={event.id}>
              {event.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
