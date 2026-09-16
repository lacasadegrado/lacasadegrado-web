import { PhotoLightbox } from "@/common/components/photo-lightbox/photo-lightbox";
import { Button } from "@/common/components/ui/button";
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants";

import { GALLERY_PATHS } from "../../lib/constants/gallery.constants";
import type { GalleryMode, GalleryPhoto } from "../../lib/types/gallery.types";
import { PhotoCardActions } from "./photo-card-actions";
import { PhotoCardFrame } from "./photo-card-frame";

type PhotoCardProps = {
  photo: GalleryPhoto;
  mode: GalleryMode;
};

/**
 * One photo in the gallery. The frame reserves the exact aspect ratio
 * before the preview arrives, so a slow connection never reflows the
 * grid. The preview is lazy and served through the gated route. Owned
 * photos and free-access viewers get the clean derivative; everything
 * else stays watermarked, including in the lightbox.
 */
export function PhotoCard({ photo, mode }: PhotoCardProps) {
  const clean = photo.owned || mode !== "buy";
  const src = clean ? PURCHASES_PATHS.viewApi(photo.id) : GALLERY_PATHS.previewApi(photo.id);

  return (
    <PhotoCardFrame photoId={photo.id} owned={photo.owned || mode !== "buy"}>
      <div
        className="relative bg-muted"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <PhotoLightbox src={src} alt="" width={photo.width} height={photo.height} />
      </div>
      <div className="space-y-2 p-2.5">
        {mode === "buy" ? (
          <PhotoCardActions
            photoId={photo.id}
            owned={photo.owned}
            priceCents={photo.priceCents}
            printPriceCents={photo.printPriceCents}
          />
        ) : mode === "free-download" ? (
          <Button asChild size="sm" className="h-9 w-full">
            <a href={PURCHASES_PATHS.downloadApi(photo.id)} download>
              Descargar
            </a>
          </Button>
        ) : (
          <span className="block text-sm text-muted-foreground">Cortesía</span>
        )}
      </div>
    </PhotoCardFrame>
  );
}
