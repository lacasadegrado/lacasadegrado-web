import { formatDateOnly } from "@/common/lib/utils/date.util";

import type { GalleryEvent } from "../lib/types/gallery.types";
import { PhotoCard } from "./photo-card/photo-card";

/**
 * Masonry by CSS columns. Every card knows its aspect ratio up front, so
 * column heights are final before any preview has loaded.
 */
export function GalleryEventSection({ event }: { event: GalleryEvent }) {
  const headingId = `event-${event.id}`;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div>
        <h2 id={headingId} className="text-xl font-bold">
          {event.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {event.institution} · {formatDateOnly(event.eventDate)} ·{" "}
          {event.photos.length} foto{event.photos.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3 [&>li]:break-inside-avoid">
        {event.photos.map((photo) => (
          <li key={photo.id}>
            <PhotoCard photo={photo} />
          </li>
        ))}
      </ul>
    </section>
  );
}
