"use client";

import { useCart } from "../lib/hooks/use-cart.hook";

/** Small count next to the cart link. Renders nothing until hydrated or when empty. */
export function CartCount() {
  const { count, hydrated } = useCart();
  if (!hydrated || count === 0) return null;
  return (
    <span
      aria-label={`${count} en el carrito`}
      className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-xs font-semibold text-amber-foreground tabular-nums"
    >
      {count}
    </span>
  );
}
