import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import { formatDateOnly } from "@/common/lib/utils/date.util";

import { EventPicker } from "../components/event-picker";
import { PhotoGrid } from "../components/photo-grid/photo-grid";
import { PhotoUploader } from "../components/photo-uploader/photo-uploader";
import {
  ADMIN_PATHS,
  DEFAULT_PHOTO_PRICE_CENTS,
  DEFAULT_PRINT_PRICE_CENTS,
} from "../lib/constants/admin.constants";
import { listEvents } from "../lib/services/event.service";
import { listPhotosForEvent } from "../lib/services/photo.service";

type AdminPhotosScreenProps = {
  eventId?: string;
};

export async function AdminPhotosScreen({ eventId }: AdminPhotosScreenProps) {
  const events = await listEvents();
  const event = eventId ? events.find((item) => item.id === eventId) : undefined;
  const photos = event ? await listPhotosForEvent(event.id) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Fotos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube las fotos de un evento y asocia cada una con los correos de las
          personas que salen en ella.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            Primero necesitas un evento donde guardar las fotos.
          </p>
          <Button asChild className="mt-4">
            <Link href={ADMIN_PATHS.events}>Crear un evento</Link>
          </Button>
        </div>
      ) : (
        <EventPicker events={events} selectedId={event?.id} />
      )}

      {event ? (
        <>
          <section aria-labelledby="upload-heading" className="space-y-4 rounded-md border p-4 sm:p-6">
            <div>
              <h2 id="upload-heading" className="text-lg font-semibold">
                Subir fotos a {event.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {event.institution} · {formatDateOnly(event.eventDate)}. Cada foto se
                guarda en original y se genera una vista previa borrosa con marca de
                agua.
              </p>
            </div>
            <PhotoUploader
              eventId={event.id}
              defaultPriceCents={DEFAULT_PHOTO_PRICE_CENTS}
              defaultPrintPriceCents={DEFAULT_PRINT_PRICE_CENTS}
            />
          </section>

          <section aria-labelledby="grid-heading" className="space-y-4">
            <div>
              <h2 id="grid-heading" className="text-lg font-semibold">
                {photos.length} foto{photos.length === 1 ? "" : "s"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Marca varias fotos para etiquetarlas, cambiarles los precios o eliminarlas de una
                vez. Cada foto tiene dos precios: la digital y la impresa, que incluye la
                digital. Cada tarjeta también acepta un correo, precios o borrarse por separado.
              </p>
            </div>
            <PhotoGrid photos={photos} />
          </section>
        </>
      ) : events.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Elige un evento para ver y subir sus fotos.
        </p>
      ) : null}
    </div>
  );
}
