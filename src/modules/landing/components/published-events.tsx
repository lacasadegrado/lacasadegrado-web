import { formatDateOnly } from "@/common/lib/utils/date.util";

import type { PublishedEvent } from "../lib/types/landing.types";

export function PublishedEvents({ events }: { events: PublishedEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="events-heading" className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id="events-heading" className="text-2xl font-bold sm:text-3xl">
          Grados ya publicados
        </h2>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Si tu acto está en esta lista, tus fotos ya deberían estar esperándote.
        </p>
        <ul className="mt-8 divide-y border-y">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
            >
              <div>
                <p className="text-base font-semibold">{event.name}</p>
                <p className="text-sm text-muted-foreground">{event.institution}</p>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatDateOnly(event.eventDate)} · {event.photoCount} foto
                {event.photoCount === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
