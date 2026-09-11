"use client";

import { useQuery } from "@tanstack/react-query";

import { CHECKOUT_QUERY_KEYS } from "@/common/lib/constants";
import { useCart } from "@/modules/cart/lib/hooks/use-cart.hook";

import { getCheckoutQuoteAction } from "../actions/checkout.action";

/**
 * Server-computed quote for the ids in the cart. Anything the viewer
 * cannot buy (unknown, untagged, already owned) is pruned from the store
 * so the order request only ever carries purchasable ids.
 */
export function useCheckoutQuote() {
  const { photoIds, hydrated, remove } = useCart();

  const query = useQuery({
    queryKey: CHECKOUT_QUERY_KEYS.quote(photoIds),
    queryFn: async () => {
      const quote = await getCheckoutQuoteAction(photoIds);
      for (const id of quote.unavailableIds) remove(id);
      for (const item of quote.items) if (item.owned) remove(item.id);
      return quote;
    },
    enabled: hydrated && photoIds.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    hydrated,
    photoIds,
    quote: query.data,
    isLoading: hydrated && photoIds.length > 0 && query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
