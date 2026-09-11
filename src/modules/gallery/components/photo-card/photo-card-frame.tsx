"use client";

import type { ReactNode } from "react";

import { cn } from "@/common/lib/utils/cn.util";
import { useIsInCart } from "@/modules/cart/lib/hooks/use-cart.hook";

type PhotoCardFrameProps = {
  photoId: string;
  owned: boolean;
  children: ReactNode;
};

/** Card border reflects selection so the state reads at a glance in a grid. */
export function PhotoCardFrame({ photoId, owned, children }: PhotoCardFrameProps) {
  const selected = useIsInCart(photoId) && !owned;

  return (
    <article
      data-selected={selected || undefined}
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        selected && "border-amber ring-2 ring-amber",
      )}
    >
      {children}
    </article>
  );
}
