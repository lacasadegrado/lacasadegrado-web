"use client";

import { Button } from "@/common/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { PHOTO_FORMAT_LABELS, PHOTO_FORMATS } from "@/common/lib/constants/catalog";
import type { PhotoFormat } from "@/common/lib/db/schema";
import { formatEur } from "@/common/lib/utils/money.util";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import type { CartItem } from "../lib/types/cart.types";

type CartLineProps = {
  item: CartItem;
  onRemove?: (photoId: string) => void;
  /** When given, the line shows a format switch. */
  onChangeFormat?: (photoId: string, format: PhotoFormat) => void;
};

export function CartLine({ item, onRemove, onChangeFormat }: CartLineProps) {
  const selectId = `format-${item.id}`;

  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="w-20 shrink-0 overflow-hidden rounded-sm bg-muted"
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GALLERY_PATHS.previewApi(item.id)}
          alt=""
          width={item.width}
          height={item.height}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{item.eventName}</p>
        {item.owned ? (
          <p className="text-sm text-muted-foreground">Ya es tuya</p>
        ) : onChangeFormat ? (
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="sr-only">
              Formato
            </label>
            <NativeSelect
              id={selectId}
              size="sm"
              value={item.format}
              onChange={(event) => onChangeFormat(item.id, event.target.value as PhotoFormat)}
            >
              {PHOTO_FORMATS.map((format) => (
                <NativeSelectOption key={format} value={format}>
                  {PHOTO_FORMAT_LABELS[format]} ·{" "}
                  {formatEur(format === "print" ? item.printPriceCents : item.priceCents)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{PHOTO_FORMAT_LABELS[item.format]}</p>
        )}
        {!item.owned && item.format === "print" ? (
          <p className="text-xs text-muted-foreground">Incluye la digital sin costo adicional.</p>
        ) : null}
      </div>
      <p className="shrink-0 text-sm tabular-nums">{formatEur(item.unitPriceCents)}</p>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          aria-label="Quitar del carrito"
        >
          Quitar
        </Button>
      ) : null}
    </li>
  );
}
