import { formatDateOnly } from "@/common/lib/utils/date.util"

import type { PurchasedEvent } from "../lib/types/purchases.types"
import { PurchasedPhotoCard } from "./purchased-photo-card"

export function PurchasesEventSection({ event }: { event: PurchasedEvent }) {
  const headingId = `purchased-${event.id}`
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div>
        <h2 id={headingId} className="text-xl font-bold">
          {event.name}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {event.institution} · {formatDateOnly(event.eventDate)} ·{" "}
          {event.photos.length} foto
          {event.photos.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3 [&>li]:break-inside-avoid">
        {event.photos.map((photo) => (
          <li key={photo.id}>
            <PurchasedPhotoCard photo={photo} />
          </li>
        ))}
      </ul>
    </section>
  )
}
