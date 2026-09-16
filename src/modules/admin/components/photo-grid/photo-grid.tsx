"use client";

import { Search, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";

import type { AdminPhoto } from "../../lib/types/admin.types";
import { BulkActionsBar } from "./bulk-actions-bar";
import { PhotoCard } from "./photo-card";

/** Photos tagged with an email that contains the query (case-insensitive). */
function matchesEmail(photo: AdminPhoto, query: string): boolean {
  if (!query) return true;
  return photo.tags.some((tag) => tag.email.includes(query));
}

/**
 * Selection and the email filter live here, not on the server: they are
 * UI state over the event's photos, which are all loaded already. Bulk
 * actions receive the selected ids and the server revalidates the grid
 * after; "select all" only takes the photos currently shown.
 */
export function PhotoGrid({ photos }: { photos: AdminPhoto[] }) {
  const searchId = useId();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [rawQuery, setRawQuery] = useState("");
  const query = rawQuery.trim().toLowerCase();

  const visible = photos.filter((photo) => matchesEmail(photo, query));
  const selectedIds = visible.filter((photo) => selected.has(photo.id)).map((photo) => photo.id);

  function toggle(photoId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Este evento todavía no tiene fotos. Súbelas arriba.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="search" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="Buscar fotos por correo"
            aria-label="Buscar fotos por correo etiquetado"
            className="pl-8"
          />
        </div>
        {rawQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRawQuery("")}
            aria-label="Limpiar búsqueda"
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {query ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length === 0
            ? `Ninguna foto está etiquetada con “${rawQuery.trim()}”.`
            : `${visible.length} de ${photos.length} foto${photos.length === 1 ? "" : "s"} con “${rawQuery.trim()}”.`}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <>
          <BulkActionsBar
            selectedIds={selectedIds}
            total={visible.length}
            onSelectAll={() => setSelected(new Set(visible.map((photo) => photo.id)))}
            onClear={() => setSelected(new Set())}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((photo) => (
              <li key={photo.id}>
                <PhotoCard
                  photo={photo}
                  selected={selected.has(photo.id)}
                  onToggleSelected={() => toggle(photo.id)}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
