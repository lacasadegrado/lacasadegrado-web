import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { GalleryEmptyState } from "../components/gallery-empty-state";
import { GalleryEventSection } from "../components/gallery-event-section";
import { GALLERY_PATHS } from "../lib/constants/gallery.constants";
import { listGalleryForUser } from "../lib/services/gallery.service";

export async function GalleryScreen() {
  const user = await requireSessionUser(GALLERY_PATHS.dashboard);
  const events = await listGalleryForUser(user);
  const total = events.reduce((sum, event) => sum + event.photos.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mis fotos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total === 0
            ? "Las fotos donde apareces, en cuanto estén listas."
            : "Elige las que quieres, agrégalas al carrito y paga para descargarlas sin marca de agua."}
        </p>
      </div>

      {events.length === 0 ? (
        <GalleryEmptyState email={user.email} />
      ) : (
        events.map((event) => <GalleryEventSection key={event.id} event={event} />)
      )}
    </div>
  );
}
