import { Button } from "@/common/components/ui/button";
import { SUPPORT_MESSAGES } from "@/modules/support/lib/constants/support.constants";
import { buildWhatsAppUrl } from "@/modules/support/lib/utils/whatsapp.util";

import type { HiddenGalleryEvent } from "../lib/types/gallery.types";

type GalleryEmptyStateProps = {
  email: string;
  /** Unpublished events where this email is tagged: the photos exist but are not shown yet. */
  hiddenEvents: HiddenGalleryEvent[];
};

/** "1 foto tuya" / "2 fotos tuyas". */
function photoCount(events: HiddenGalleryEvent[]): string {
  const total = events.reduce((sum, event) => sum + event.photoCount, 0);
  return total === 1 ? "1 foto tuya" : `${total} fotos tuyas`;
}

function isSingle(events: HiddenGalleryEvent[]): boolean {
  return events.reduce((sum, event) => sum + event.photoCount, 0) === 1;
}

function eventNames(events: HiddenGalleryEvent[]): string {
  const names = events.map((event) => event.name);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function GalleryEmptyState({ email, hiddenEvents }: GalleryEmptyStateProps) {
  if (hiddenEvents.length > 0) {
    const single = isSingle(hiddenEvents);
    return (
      <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
        <h2 className="text-xl font-bold">{single ? "Tu foto está casi lista" : "Tus fotos están casi listas"}</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Ya tenemos {photoCount(hiddenEvents)} de{" "}
          <span className="font-medium text-foreground">{eventNames(hiddenEvents)}</span>.{" "}
          {single
            ? "La estamos terminando de preparar y aparecerá aquí en cuanto la publiquemos; no tienes que hacer nada."
            : "Las estamos terminando de preparar y aparecerán aquí en cuanto las publiquemos; no tienes que hacer nada."}
        </p>
        <p className="mt-3 text-base text-muted-foreground">
          Entraste con <span className="font-medium text-foreground">{email}</span>: es el correo
          correcto.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
      <h2 className="text-xl font-bold">Todavía no hay fotos para este correo</h2>
      <p className="mt-3 text-base text-muted-foreground">
        Tus fotos aparecen aquí cuando el fotógrafo termina de subirlas y las
        asocia al correo que diste en tu graduación. Eso puede tardar unos días
        después del acto.
      </p>
      <p className="mt-3 text-base text-muted-foreground">
        Entraste con{" "}
        <span className="font-medium text-foreground">{email}</span>. Si diste
        otro correo ese día, sal y vuelve a entrar con ese.
      </p>
      <div className="mt-6">
        <Button asChild>
          <a
            href={buildWhatsAppUrl(SUPPORT_MESSAGES.noPhotos(email))}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}

/** Under the published events, when other events with this person's photos are still hidden. */
export function GalleryHiddenNote({ hiddenEvents }: { hiddenEvents: HiddenGalleryEvent[] }) {
  return (
    <p className="max-w-xl rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      También tenemos {photoCount(hiddenEvents)} de{" "}
      <span className="font-medium text-foreground">{eventNames(hiddenEvents)}</span>.{" "}
      {isSingle(hiddenEvents)
        ? "Aparecerá aquí en cuanto la publiquemos."
        : "Aparecerán aquí en cuanto las publiquemos."}
    </p>
  );
}
