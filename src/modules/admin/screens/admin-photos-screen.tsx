import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import { formatDateOnly } from "@/common/lib/utils/date.util";

import { FolderCard, photoCountLabel } from "../components/photo-folders/folder-card";
import { PeopleSearchForm } from "../components/photo-folders/people-search-form";
import { PersonFolderList } from "../components/photo-folders/person-folder-list";
import { PhotosBreadcrumb } from "../components/photo-folders/photos-breadcrumb";
import { UploadPhotosPanel } from "../components/photo-folders/upload-photos-panel";
import { PhotoGrid } from "../components/photo-grid/photo-grid";
import {
  ADMIN_PATHS,
  DEFAULT_PHOTO_PRICE_CENTS,
  DEFAULT_PRINT_PRICE_CENTS,
  PHOTO_FOLDERS,
} from "../lib/constants/admin.constants";
import { listEmailSuggestionsForEvent } from "../lib/services/email-suggestion.service";
import {
  listEventFolders,
  listPersonFolders,
  personFolderName,
  searchPersonFolders,
} from "../lib/services/photo-folder.service";
import { listPhotosForEvent } from "../lib/services/photo.service";
import type { PhotoEventFolder, PhotoListFilter } from "../lib/types/admin.types";

type AdminPhotosScreenProps = {
  eventId?: string;
  /** `PHOTO_FOLDERS.untagged`, `PHOTO_FOLDERS.all` or a tagged email. */
  folder?: string;
  /** Search across every event, by name or email. */
  search?: string;
};

/**
 * Fotos as Drive-like folders: events, then one folder per tagged person
 * (plus "Sin etiquetar" and "Todas las fotos"), then the photos. Folders
 * are read from the tags; nothing is stored for them.
 */
export async function AdminPhotosScreen({ eventId, folder, search }: AdminPhotosScreenProps) {
  const events = await listEventFolders();
  const event = eventId ? events.find((item) => item.id === eventId) : undefined;

  if (!event) return <EventsView events={events} search={search?.trim()} />;
  if (!folder) return <EventView event={event} />;
  return <FolderView event={event} folder={folder} />;
}

function EventsView({ events, search }: { events: PhotoEventFolder[]; search?: string }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <PhotosBreadcrumb crumbs={search ? [{ label: "Fotos", href: ADMIN_PATHS.photos }, { label: "Búsqueda" }] : [{ label: "Fotos" }]} />
        <h1 className="text-2xl font-bold">Fotos</h1>
        <p className="text-sm text-muted-foreground">
          Cada evento es una carpeta, y dentro hay una carpeta por persona.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed p-6">
          <p className="text-sm text-muted-foreground">Primero necesitas un evento donde guardar las fotos.</p>
          <Button asChild className="mt-4">
            <Link href={ADMIN_PATHS.events}>Crear un evento</Link>
          </Button>
        </div>
      ) : (
        <>
          <PeopleSearchForm key={search ?? ""} defaultValue={search} />
          {search ? <SearchResults search={search} /> : <EventFolders events={events} />}
        </>
      )}
    </div>
  );
}

async function SearchResults({ search }: { search: string }) {
  const hits = await searchPersonFolders(search);

  return (
    <section aria-labelledby="search-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="search-heading" className="text-lg font-semibold">
          {hits.length === 0
            ? `Nadie con “${search}” tiene fotos`
            : `${hits.length} carpeta${hits.length === 1 ? "" : "s"} con “${search}”`}
        </h2>
        <Link href={ADMIN_PATHS.photos} className="text-sm underline underline-offset-4">
          Ver todos los eventos
        </Link>
      </div>
      {hits.length === 0 ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          Puede que sus fotos todavía no tengan su correo. Entra al evento y revisa la carpeta
          “Sin etiquetar”.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {hits.map((hit) => (
            <li key={`${hit.eventId}-${hit.email}`}>
              <FolderCard
                href={ADMIN_PATHS.photoFolder(hit.eventId, hit.email)}
                title={hit.name ?? hit.email}
                subtitle={hit.name ? hit.email : undefined}
                detail={`${hit.eventName} · ${photoCountLabel(hit.photoCount)}`}
                coverPhotoId={hit.coverPhotoId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventFolders({ events }: { events: PhotoEventFolder[] }) {
  return (
    <section aria-labelledby="events-heading" className="space-y-4">
      <h2 id="events-heading" className="text-lg font-semibold">
        Eventos
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => (
          <li key={event.id}>
            <FolderCard
              href={ADMIN_PATHS.photoFolder(event.id)}
              title={event.name}
              subtitle={[event.institution, event.eventDate ? formatDateOnly(event.eventDate) : null]
                .filter(Boolean)
                .join(" · ")}
              detail={`${photoCountLabel(event.photoCount)} · ${event.peopleCount} persona${event.peopleCount === 1 ? "" : "s"}`}
              coverPhotoId={event.coverPhotoId}
              tone={event.untaggedCount > 0 ? "attention" : "default"}
            >
              {event.untaggedCount > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {event.untaggedCount} sin etiquetar
                </span>
              ) : null}
            </FolderCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function EventView({ event }: { event: PhotoEventFolder }) {
  const emailSuggestions = await listEmailSuggestionsForEvent(event.id);
  // Only the untagged photos: a fresh upload lands there, and the dialog after it reads them.
  const [folders, untagged] = await Promise.all([
    listPersonFolders(event.id, emailSuggestions),
    listPhotosForEvent(event.id, { kind: "untagged" }),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <PhotosBreadcrumb crumbs={[{ label: "Fotos", href: ADMIN_PATHS.photos }, { label: event.name }]} />
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {event.institution}
          {event.eventDate ? ` · ${formatDateOnly(event.eventDate)}` : null} ·{" "}
          {photoCountLabel(event.photoCount)}. Entra a la carpeta de una persona para ver, etiquetar o
          subir sus fotos.
        </p>
      </div>

      <UploadPhotosPanel
        eventId={event.id}
        eventName={event.name}
        photos={untagged}
        emailSuggestions={emailSuggestions}
        defaultPriceCents={DEFAULT_PHOTO_PRICE_CENTS}
        defaultPrintPriceCents={DEFAULT_PRINT_PRICE_CENTS}
        defaultOpen={event.photoCount === 0}
      />

      {event.photoCount === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Este evento todavía no tiene fotos. Súbelas arriba.
        </p>
      ) : (
        <PersonFolderList
          eventId={event.id}
          folders={folders}
          untaggedCount={event.untaggedCount}
          totalPhotos={event.photoCount}
          coverPhotoId={event.coverPhotoId}
        />
      )}
    </div>
  );
}

async function FolderView({ event, folder }: { event: PhotoEventFolder; folder: string }) {
  const filter: PhotoListFilter =
    folder === PHOTO_FOLDERS.untagged
      ? { kind: "untagged" }
      : folder === PHOTO_FOLDERS.all
        ? { kind: "all" }
        : { kind: "person", email: folder.trim().toLowerCase() };

  const emailSuggestions = await listEmailSuggestionsForEvent(event.id);
  const photos = await listPhotosForEvent(event.id, filter);

  const person =
    filter.kind === "person"
      ? { email: filter.email, name: await personFolderName(filter.email, emailSuggestions) }
      : undefined;
  const title =
    filter.kind === "untagged" ? "Sin etiquetar" : filter.kind === "all" ? "Todas las fotos" : (person?.name ?? filter.email);
  const description =
    filter.kind === "untagged"
      ? "Fotos que aún no tienen el correo de nadie. Márcalas y usa “Etiquetar” para pasarlas a la carpeta de esa persona."
      : filter.kind === "all"
        ? "Todas las fotos del evento. Las fotos sin correo salen primero."
        : `${person?.name ? `${filter.email} · ` : ""}Las fotos donde sale esta persona. Una foto de grupo aparece en la carpeta de cada persona etiquetada.`;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <PhotosBreadcrumb
          crumbs={[
            { label: "Fotos", href: ADMIN_PATHS.photos },
            { label: event.name, href: ADMIN_PATHS.photoFolder(event.id) },
            { label: title },
          ]}
        />
        <h1 className="text-2xl font-bold break-words">{title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>

      <UploadPhotosPanel
        eventId={event.id}
        eventName={event.name}
        photos={photos}
        emailSuggestions={emailSuggestions}
        defaultPriceCents={DEFAULT_PHOTO_PRICE_CENTS}
        defaultPrintPriceCents={DEFAULT_PRINT_PRICE_CENTS}
        person={person}
      />

      <section aria-labelledby="grid-heading" className="space-y-4">
        <div>
          <h2 id="grid-heading" className="text-lg font-semibold">
            {photoCountLabel(photos.length)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Marca varias fotos para etiquetarlas, cambiarles los precios o eliminarlas de una vez.
          </p>
        </div>
        <PhotoGrid
          // A new folder starts with its own selection and filters.
          key={folder}
          photos={photos}
          emailSuggestions={emailSuggestions}
          searchable={filter.kind === "all"}
          emptyMessage={
            filter.kind === "untagged"
              ? "Todas las fotos de este evento ya tienen a alguien. ¡Bien!"
              : filter.kind === "person"
                ? "Esta persona no tiene fotos en este evento. Súbelas con el botón de arriba."
                : "Este evento todavía no tiene fotos. Súbelas arriba."
          }
        />
      </section>
    </div>
  );
}
