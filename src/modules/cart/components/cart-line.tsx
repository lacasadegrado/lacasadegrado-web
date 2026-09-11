"use client";

import { Button } from "@/common/components/ui/button";
import { formatUsd } from "@/common/lib/utils/money.util";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import type { CartItem } from "../lib/types/cart.types";

type CartLineProps = {
  item: CartItem;
  onRemove?: (photoId: string) => void;
};

export function CartLine({ item, onRemove }: CartLineProps) {
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.eventName}</p>
        <p className="text-sm text-muted-foreground">
          {item.owned ? "Ya es tuya" : "Foto en alta resolución"}
        </p>
      </div>
      <p className="shrink-0 text-sm tabular-nums">{formatUsd(item.priceCents)}</p>
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
