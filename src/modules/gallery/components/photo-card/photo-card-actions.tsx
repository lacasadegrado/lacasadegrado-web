"use client";

import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import { useCart, useIsInCart } from "@/modules/cart/lib/hooks/use-cart.hook";

import { GALLERY_PATHS } from "../../lib/constants/gallery.constants";

type PhotoCardActionsProps = {
  photoId: string;
  owned: boolean;
};

export function PhotoCardActions({ photoId, owned }: PhotoCardActionsProps) {
  const { toggle, hydrated } = useCart();
  const inCart = useIsInCart(photoId);

  if (owned) {
    return (
      <Button asChild variant="secondary" size="sm" className="h-9 w-full">
        <Link href={GALLERY_PATHS.purchases}>Ya es tuya · Ver</Link>
      </Button>
    );
  }

  const selected = hydrated && inCart;

  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      size="sm"
      className="h-9 w-full"
      aria-pressed={selected}
      onClick={() => toggle(photoId)}
    >
      {selected ? "En el carrito" : "Agregar al carrito"}
    </Button>
  );
}
