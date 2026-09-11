"use client";

import { useState } from "react";

import { PhotoLightbox } from "@/common/components/photo-lightbox/photo-lightbox";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/cn.util";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import { PURCHASES_PATHS } from "../lib/constants/purchases.constants";
import type { PurchasedPhoto } from "../lib/types/purchases.types";

/**
 * The one considered motion moment in the product: the blurred preview
 * the student has been looking at until now dissolves into the clean
 * photo as it arrives. Reduced-motion users get an instant swap through
 * the global rule in globals.css.
 */
export function PurchasedPhotoCard({ photo }: { photo: PurchasedPhoto }) {
  const [revealed, setRevealed] = useState(false);
  const cleanSrc = PURCHASES_PATHS.viewApi(photo.id);

  return (
    <article className="overflow-hidden rounded-md border bg-background">
      <div
        className="relative overflow-hidden bg-muted"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        {/* Base layer: the blurred preview, already cached from the gallery. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GALLERY_PATHS.previewApi(photo.id)}
          alt=""
          aria-hidden="true"
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Clean layer: fades and sharpens in once loaded. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cleanSrc}
          alt={`Foto ${photo.originalFilename}`}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          onLoad={() => setRevealed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,filter,transform] duration-700 ease-out",
            revealed ? "scale-100 opacity-100 blur-0" : "scale-[1.03] opacity-0 blur-md",
          )}
        />
        <PhotoLightbox
          src={cleanSrc}
          alt={`Foto ${photo.originalFilename}`}
          width={photo.width}
          height={photo.height}
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-2.5">
        <p className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={photo.originalFilename}>
          {photo.originalFilename}
        </p>
        <Button asChild size="sm" className="h-9 shrink-0">
          <a href={PURCHASES_PATHS.downloadApi(photo.id)} download>
            Descargar
          </a>
        </Button>
      </div>
    </article>
  );
}
