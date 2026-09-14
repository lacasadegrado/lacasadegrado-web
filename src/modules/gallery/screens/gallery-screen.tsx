import { Button } from "@/common/components/ui/button";
import { getViewerAccess } from "@/modules/auth/lib/services/access.service";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants";

import { GalleryEmptyState } from "../components/gallery-empty-state";
import { GalleryEventSection } from "../components/gallery-event-section";
import { GALLERY_PATHS } from "../lib/constants/gallery.constants";
import { listGalleryForUser } from "../lib/services/gallery.service";
import type { GalleryMode } from "../lib/types/gallery.types";

const SUBTITLES: Record<GalleryMode, string> = {
  buy: "Elige las que quieres, agrégalas al carrito y paga para descargarlas sin marca de agua.",
  "free-view": "Tienes acceso especial: ves tus fotos sin marca de agua.",
  "free-download":
    "Tienes acceso especial: puedes ver y descargar tus fotos en alta resolución sin costo.",
};

export async function GalleryScreen() {
  const user = await requireSessionUser(GALLERY_PATHS.dashboard);
  const [events, access] = await Promise.all([listGalleryForUser(user), getViewerAccess(user)]);
  const total = events.reduce((sum, event) => sum + event.photos.length, 0);
  const mode: GalleryMode = access.freeDownload
    ? "free-download"
    : access.freeView
      ? "free-view"
      : "buy";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Mis fotos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0 ? "Las fotos donde apareces, en cuanto estén listas." : SUBTITLES[mode]}
          </p>
        </div>
        {mode === "free-download" && total > 1 ? (
          <Button asChild variant="outline" size="lg" className="h-10">
            <a href={PURCHASES_PATHS.downloadAllApi} download>
              Descargar todas (.zip)
            </a>
          </Button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <GalleryEmptyState email={user.email} />
      ) : (
        events.map((event) => <GalleryEventSection key={event.id} event={event} mode={mode} />)
      )}
    </div>
  );
}
