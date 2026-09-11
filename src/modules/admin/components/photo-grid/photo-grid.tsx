import type { AdminPhoto } from "../../lib/types/admin.types";
import { PhotoCard } from "./photo-card";

export function PhotoGrid({ photos }: { photos: AdminPhoto[] }) {
  if (photos.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Este evento todavía no tiene fotos. Súbelas arriba.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id}>
          <PhotoCard photo={photo} />
        </li>
      ))}
    </ul>
  );
}
