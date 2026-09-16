"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import { Label } from "@/common/components/ui/label";
import { BUSINESS } from "@/common/lib/config/business.config";
import { CHECKOUT_QUERY_KEYS } from "@/common/lib/constants";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatRate, formatEur, formatVes } from "@/common/lib/utils/money.util";
import { CartLine } from "@/modules/cart/components/cart-line";
import { CartListSkeleton } from "@/modules/cart/components/cart-list-skeleton";
import { useCart } from "@/modules/cart/lib/hooks/use-cart.hook";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";
import { LEGAL_PATHS } from "@/modules/legal/lib/constants/legal.constants";

import { createOrderAction } from "../lib/actions/checkout.action";
import { CHECKOUT_PATHS, PAYMENT_METHODS } from "../lib/constants/checkout.constants";
import { useCheckoutQuote } from "../lib/hooks/use-checkout-quote.hook";
import { PaymentMethodPicker } from "./payment-method-picker";

const DEFAULT_METHOD = PAYMENT_METHODS.find((m) => m.enabled)?.id ?? "pago_movil";

export function CheckoutFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clear, remove } = useCart();
  const { hydrated, lines, quote, isLoading, isError, refetch } = useCheckoutQuote();
  const [method, setMethod] = useState<string>(DEFAULT_METHOD);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const createOrder = useMutation({
    mutationFn: createOrderAction,
    onSuccess: (result) => {
      if (result.ok) {
        // Order exists now; the cart is spent. Keep the summary on screen
        // while the payment page loads instead of flashing the empty state.
        setCreatedOrderId(result.orderId);
        clear();
        router.push(CHECKOUT_PATHS.payment(result.orderId));
        return;
      }
      if (result.reason === "unavailable") {
        for (const id of result.unavailableIds ?? []) remove(id);
        void queryClient.invalidateQueries({ queryKey: CHECKOUT_QUERY_KEYS.all });
        setMessage(
          "Algunas fotos ya no están disponibles y las quitamos del carrito. Revisa el total antes de continuar.",
        );
        return;
      }
      if (result.reason === "terms") {
        setMessage("Acepta los términos y condiciones para continuar.");
        return;
      }
      if (result.reason === "no_rate") {
        setMessage("No pudimos obtener la tasa del día. Intenta de nuevo en unos minutos.");
        return;
      }
      setMessage("Tu carrito está vacío.");
    },
    onError: () => setMessage("No pudimos crear el pedido. Intenta de nuevo."),
  });

  if (createdOrderId) {
    return (
      <section className="max-w-xl rounded-md border p-6 sm:p-8" aria-busy="true">
        <h2 className="text-xl font-bold">Pedido creado</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Te llevamos a los datos para pagar…
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href={CHECKOUT_PATHS.payment(createdOrderId)}>Ir a pagar</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!hydrated || isLoading) return <CartListSkeleton />;

  if (isError) {
    return (
      <Alert role="alert">
        <AlertDescription>
          No pudimos preparar tu pedido.{" "}
          <button type="button" onClick={() => refetch()} className="font-medium underline underline-offset-4">
            Intentar de nuevo
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const items = quote?.items.filter((item) => !item.owned) ?? [];
  if (lines.length === 0 || items.length === 0) {
    return (
      <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
        <h2 className="text-xl font-bold">No hay nada que pagar todavía</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Agrega fotos al carrito desde Mis fotos y vuelve aquí.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href={GALLERY_PATHS.dashboard}>Ver mis fotos</Link>
          </Button>
        </div>
      </section>
    );
  }

  const rate = quote?.rate ?? null;
  const total = quote?.totalCents ?? 0;
  const printCount = quote?.printCount ?? 0;
  const canContinue = Boolean(rate) && acceptTerms && !createOrder.isPending;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-base font-semibold">
            {items.length} foto{items.length === 1 ? "" : "s"}
          </h2>
          <ul className="mt-3 divide-y border-y">
            {items.map((item) => (
              <CartLine key={item.id} item={item} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="method-heading" className="space-y-3">
          <h2 id="method-heading" className="text-base font-semibold">
            ¿Cómo vas a pagar?
          </h2>
          <PaymentMethodPicker value={method} onChange={setMethod} disabled={createOrder.isPending} />
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-md border p-4 lg:sticky lg:top-4">
        <h2 className="text-base font-semibold">Total</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatEur(quote?.subtotalCents ?? 0)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total en euros</dt>
            <dd className="tabular-nums">{formatEur(total)}</dd>
          </div>
          {rate ? (
            <>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total en bolívares</dt>
                <dd className="tabular-nums">{formatVes(total, rate.eurToVes)}</dd>
              </div>
              <p className="text-xs text-muted-foreground">
                Tasa {formatRate(rate.eurToVes)} ({formatDateTime(rate.effectiveAt)}). Se fija
                al crear el pedido.
              </p>
            </>
          ) : (
            <p className="text-xs font-medium">
              No pudimos obtener la tasa del día. Intenta de nuevo en unos minutos.
            </p>
          )}
        </dl>

        {message ? (
          <Alert role="alert">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="accept-terms"
            checked={acceptTerms}
            onCheckedChange={(value) => setAcceptTerms(value === true)}
            disabled={createOrder.isPending}
            className="mt-0.5"
          />
          <Label htmlFor="accept-terms" className="text-sm leading-snug font-normal">
            <span>
              Acepto los{" "}
              <Link href={LEGAL_PATHS.terms} target="_blank" className="underline underline-offset-4">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href={LEGAL_PATHS.privacy} target="_blank" className="underline underline-offset-4">
                política de privacidad
              </Link>
              .
            </span>
          </Label>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          disabled={!canContinue}
          onClick={() => {
            setMessage(null);
            createOrder.mutate({
              lines: items.map((item) => ({ photoId: item.id, format: item.format })),
              paymentMethod: method,
              acceptTerms,
            });
          }}
        >
          {createOrder.isPending ? "Creando pedido…" : "Continuar al pago"}
        </Button>
        <p className="text-xs text-muted-foreground">
          En el siguiente paso verás los datos para pagar y podrás enviar tu comprobante.
        </p>
        {printCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {printCount === 1 ? "Tu foto impresa se entrega" : `Tus ${printCount} fotos impresas se entregan`}{" "}
            en tu institución en unos {BUSINESS.print.deliveryDays} días después de aprobar el
            pago. Pasados {BUSINESS.print.responsibilityDays} días desde esa entrega, la
            responsabilidad sobre la foto es de la institución.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
