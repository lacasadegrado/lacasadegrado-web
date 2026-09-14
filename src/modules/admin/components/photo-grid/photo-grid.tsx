"use client";

import { useState } from "react";

import type { AdminPhoto } from "../../lib/types/admin.types";
import { BulkActionsBar } from "./bulk-actions-bar";
import { PhotoCard } from "./photo-card";

/**
 * Selection lives here, not on the server: it is UI state. Bulk actions
 * receive the selected ids and the server revalidates the grid after.
 */
export function PhotoGrid({ photos }: { photos: AdminPhoto[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectedIds = photos.filter((photo) => selected.has(photo.id)).map((photo) => photo.id);

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
      <BulkActionsBar
        selectedIds={selectedIds}
        total={photos.length}
        onSelectAll={() => setSelected(new Set(photos.map((photo) => photo.id)))}
        onClear={() => setSelected(new Set())}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => (
          <li key={photo.id}>
            <PhotoCard
              photo={photo}
              selected={selected.has(photo.id)}
              onToggleSelected={() => toggle(photo.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
