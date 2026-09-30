import Link from "next/link";

import { Button } from "@/common/components/ui/button";

import { EventPicker } from "../components/event-picker";
import { CreateFormDialog } from "../components/forms/create-form-dialog";
import { FormsList } from "../components/forms/forms-list";
import { PackageDialog } from "../components/forms/package-dialog";
import { PackagesTable } from "../components/forms/packages-table";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { listEvents } from "../lib/services/event.service";
import { listFormsForEvent } from "../lib/services/form.service";
import { listPackagesForEvent } from "../lib/services/package.service";

type AdminEventFormsScreenProps = {
  eventId?: string;
};

export async function AdminEventFormsScreen({ eventId }: AdminEventFormsScreenProps) {
  const events = await listEvents();
  const event = eventId ? events.find((item) => item.id === eventId) : undefined;
  const [packages, forms] = event
    ? await Promise.all([listPackagesForEvent(event.id), listFormsForEvent(event.id)])
    : [[], []];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Formularios</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Formularios con link público, sin iniciar sesión, para que las personas reporten el pago
          de un paquete de fotos del evento. Cada evento tiene sus paquetes y puede tener varios
          formularios.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            Primero necesitas un evento para crearle paquetes y formularios.
          </p>
          <Button asChild className="mt-4">
            <Link href={ADMIN_PATHS.events}>Crear un evento</Link>
          </Button>
        </div>
      ) : (
        <EventPicker
          events={events}
          selectedId={event?.id}
          basePath={ADMIN_PATHS.eventForms}
          showPhotoCount={false}
        />
      )}

      {event ? (
        <>
          <section aria-labelledby="packages-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="packages-heading" className="text-lg font-semibold">
                  Paquetes de {event.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Los paquetes activos aparecen en la lista para elegir de todos los formularios del
                  evento.
                </p>
              </div>
              <PackageDialog mode="create" eventId={event.id} />
            </div>
            <PackagesTable packages={packages} />
          </section>

          <section aria-labelledby="forms-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="forms-heading" className="text-lg font-semibold">
                  Formularios
                </h2>
                <p className="text-sm text-muted-foreground">
                  Solo los formularios abiertos reciben respuestas. Un formulario con respuestas se
                  cierra, no se borra.
                </p>
              </div>
              <CreateFormDialog eventId={event.id} />
            </div>
            <FormsList eventId={event.id} forms={forms} />
          </section>
        </>
      ) : events.length > 0 ? (
        <p className="text-sm text-muted-foreground">Elige un evento para ver sus paquetes y formularios.</p>
      ) : null}
    </div>
  );
}
