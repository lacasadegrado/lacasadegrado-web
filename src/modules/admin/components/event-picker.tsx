"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/common/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";

import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import type { AdminEvent } from "../lib/types/admin.types";

type EventPickerProps = {
  events: AdminEvent[];
  selectedId?: string;
  /** Page the picker navigates on, with `?event=<id>`. Defaults to Fotos. */
  basePath?: string;
  /** Shows the photo count next to each event, which only Fotos needs. */
  showPhotoCount?: boolean;
};

export function EventPicker({
  events,
  selectedId,
  basePath = ADMIN_PATHS.photos,
  showPhotoCount = true,
}: EventPickerProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Label htmlFor="event-picker">Evento</Label>
      <NativeSelect
        id="event-picker"
        value={selectedId ?? ""}
        onChange={(event) => {
          const id = event.target.value;
          router.push(id ? `${basePath}?event=${id}` : basePath);
        }}
        className="max-w-md"
      >
        <NativeSelectOption value="">Elige un evento…</NativeSelectOption>
        {events.map((event) => (
          <NativeSelectOption key={event.id} value={event.id}>
            {event.name} · {event.institution}
            {showPhotoCount ? ` (${event.photoCount})` : ""}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
