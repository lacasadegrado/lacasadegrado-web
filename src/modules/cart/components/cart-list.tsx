"use client";

import Link from "next/link";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { formatUsd } from "@/common/lib/utils/money.util";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import { CART_PATHS } from "../lib/constants/cart.constants";
import { useCart } from "../lib/hooks/use-cart.hook";
import { useCartItems } from "../lib/hooks/use-cart-items.hook";
import { CartLine } from "./cart-line";
import { CartListSkeleton } from "./cart-list-skeleton";

export function CartList() {
  const { remove } = useCart();
  const { hydrated, photoIds, items, isLoading, isError, refetch } = useCartItems();

  if (!hydrated || isLoading) return <CartListSkeleton />;

  if (isError) {
    return (
      <Alert role="alert">
        <AlertDescription>
          No pudimos cargar tu carrito.{" "}
          <button type="button" onClick={() => refetch()} className="font-medium underline underline-offset-4">
            Intentar de nuevo
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (photoIds.length === 0 || items.length === 0) {
    return (
      <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
        <h2 className="text-xl font-bold">Tu carrito está vacío</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Elige las fotos que quieres en Mis fotos y agrégalas aquí.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href={GALLERY_PATHS.dashboard}>Ver mis fotos</Link>
          </Button>
        </div>
      </section>
    );
  }

  const buyable = items.filter((item) => !item.owned);
  const owned = items.filter((item) => item.owned);
  const subtotal = buyable.reduce((sum, item) => sum + item.priceCents, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        {owned.length > 0 ? (
          <Alert role="status" className="mb-4">
            <AlertDescription>
              {owned.length === 1
                ? "Una de estas fotos ya es tuya y no se cobrará."
                : `${owned.length} de estas fotos ya son tuyas y no se cobrarán.`}{" "}
              <button
                type="button"
                onClick={() => owned.forEach((item) => remove(item.id))}
                className="font-medium underline underline-offset-4"
              >
                Quitarlas del carrito
              </button>
            </AlertDescription>
          </Alert>
        ) : null}
        <ul className="divide-y border-y">
          {items.map((item) => (
            <CartLine key={item.id} item={item} onRemove={remove} />
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-md border p-4 lg:sticky lg:top-4">
        <h2 className="text-base font-semibold">Resumen</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {buyable.length} foto{buyable.length === 1 ? "" : "s"}
            </dt>
            <dd className="tabular-nums">{formatUsd(subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatUsd(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          El equivalente en bolívares se calcula al pagar con la tasa del día.
        </p>
        <Button asChild size="lg" className="mt-4 h-11 w-full" disabled={buyable.length === 0}>
          <Link href={CART_PATHS.checkout} aria-disabled={buyable.length === 0}>
            Pagar
          </Link>
        </Button>
      </aside>
    </div>
  );
}
