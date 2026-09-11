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
};

export function EventPicker({ events, selectedId }: EventPickerProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Label htmlFor="event-picker">Evento</Label>
      <NativeSelect
        id="event-picker"
        value={selectedId ?? ""}
        onChange={(event) => {
          const id = event.target.value;
          router.push(id ? `${ADMIN_PATHS.photos}?event=${id}` : ADMIN_PATHS.photos);
        }}
        className="max-w-md"
      >
        <NativeSelectOption value="">Elige un evento…</NativeSelectOption>
        {events.map((event) => (
          <NativeSelectOption key={event.id} value={event.id}>
            {event.name} · {event.institution} ({event.photoCount})
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
