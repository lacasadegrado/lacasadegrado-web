"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import { PHOTO_FORMAT_LABELS, PHOTO_FORMATS } from "@/common/lib/constants/catalog";
import type { PhotoFormat } from "@/common/lib/db/schema";
import { cn } from "@/common/lib/utils/cn.util";
import { formatEur } from "@/common/lib/utils/money.util";
import { useCart, useCartFormat } from "@/modules/cart/lib/hooks/use-cart.hook";

import { GALLERY_PATHS } from "../../lib/constants/gallery.constants";

type PhotoCardActionsProps = {
  photoId: string;
  owned: boolean;
  priceCents: number;
  printPriceCents: number;
};

/**
 * One choice per photo: the digital file, or the print that includes it.
 * Tapping an option puts the photo in the cart in that format; tapping
 * the selected option again takes it out. Never both at once.
 */
export function PhotoCardActions({ photoId, owned, priceCents, printPriceCents }: PhotoCardActionsProps) {
  const { add, remove, hydrated } = useCart();
  const inCartAs = useCartFormat(photoId);

  if (owned) {
    return (
      <Button asChild variant="secondary" size="sm" className="h-9 w-full">
        <Link href={GALLERY_PATHS.purchases}>Ya es tuya · Ver</Link>
      </Button>
    );
  }

  const prices: Record<PhotoFormat, number> = { digital: priceCents, print: printPriceCents };

  return (
    <div className="space-y-1.5">
      <div role="group" aria-label="Elige un formato" className="space-y-1.5">
        {PHOTO_FORMATS.map((format) => {
          const selected = hydrated && inCartAs === format;
          return (
            <Button
              key={format}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              aria-pressed={selected}
              onClick={() => (selected ? remove(photoId) : add(photoId, format))}
              className={cn("h-9 w-full justify-between px-2.5", selected && "ring-2 ring-amber")}
            >
              <span className="flex items-center gap-1.5">
                {selected ? <Check aria-hidden="true" className="size-4" /> : null}
                {PHOTO_FORMAT_LABELS[format]}
              </span>
              <span className="tabular-nums">{formatEur(prices[format])}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {inCartAs
          ? inCartAs === "print"
            ? "En el carrito como impresa. Incluye la digital sin costo adicional."
            : "En el carrito como digital."
          : "La impresa incluye la digital sin costo adicional."}
      </p>
    </div>
  );
}
