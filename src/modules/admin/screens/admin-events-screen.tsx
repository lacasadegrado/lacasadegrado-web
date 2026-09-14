import { EventForm } from "../components/event-form"
import { EventsTable } from "../components/events-table"
import { listEvents } from "../lib/services/event.service"

export async function AdminEventsScreen() {
  const events = await listEvents()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un evento agrupa las fotos de un acto de grado. Crea el evento y luego
          sube las fotos en la pestaña Fotos.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <section aria-labelledby="new-event-heading" className="space-y-4">
          <h2 id="new-event-heading" className="text-lg font-semibold">
            Nuevo evento
          </h2>
          <EventForm />
        </section>

        <section aria-labelledby="events-heading" className="space-y-4">
          <h2 id="events-heading" className="text-lg font-semibold">
            Todos los eventos
          </h2>
          <EventsTable events={events} />
        </section>
      </div>
    </div>
  )
}
