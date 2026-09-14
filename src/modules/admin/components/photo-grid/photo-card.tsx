"use client"

import { PhotoLightbox } from "@/common/components/photo-lightbox/photo-lightbox"
import { Button } from "@/common/components/ui/button"
import { Checkbox } from "@/common/components/ui/checkbox"
import { cn } from "@/common/lib/utils/cn.util"
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants"

import { removeTagAction } from "../../lib/actions/photo.action"
import type { AdminPhoto } from "../../lib/types/admin.types"
import { DeletePhotoButton } from "./delete-photo-button"
import { PhotoPriceForm } from "./photo-price-form"
import { TagForm } from "./tag-form"

type PhotoCardProps = {
  photo: AdminPhoto
  selected: boolean
  onToggleSelected: () => void
}

/** Admins always see the clean derivative; the view route allows it for them. */
export function PhotoCard({
  photo,
  selected,
  onToggleSelected,
}: PhotoCardProps) {
  const src = PURCHASES_PATHS.viewApi(photo.id)
  const checkboxId = `select-${photo.id}`

  return (
    <article
      data-selected={selected || undefined}
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        selected && "border-amber ring-2 ring-amber",
      )}
    >
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
          className="h-full w-full object-cover"
        />
        <label
          htmlFor={checkboxId}
          className="absolute top-2 left-2 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-background/90 ring-1 ring-border"
        >
          <Checkbox
            id={checkboxId}
            checked={selected}
            onCheckedChange={onToggleSelected}
            aria-label={`Seleccionar ${photo.originalFilename}`}
          />
        </label>
        <PhotoLightbox
          src={src}
          alt={photo.originalFilename}
          width={photo.width}
          height={photo.height}
        />
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p
            className="min-w-0 truncate font-mono text-xs"
            title={photo.originalFilename}
          >
            {photo.originalFilename}
          </p>
          <DeletePhotoButton
            photoId={photo.id}
            filename={photo.originalFilename}
          />
        </div>

        {/* Keyed on the server value so a bulk price change resets the local draft. */}
        <PhotoPriceForm
          key={photo.priceCents}
          photoId={photo.id}
          priceCents={photo.priceCents}
        />

        {photo.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {photo.tags.map((tag) => (
              <li key={tag.id}>
                <form action={removeTagAction} className="inline-flex">
                  <input type="hidden" name="tagId" value={tag.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="xs"
                    aria-label={`Quitar ${tag.email}`}
                    title="Quitar"
                    className="max-w-[16rem] font-normal"
                  >
                    <span className="truncate">{tag.email}</span>
                    <span aria-hidden="true">×</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin correos todavía.</p>
        )}

        <TagForm photoId={photo.id} />
      </div>
    </article>
  )
}
