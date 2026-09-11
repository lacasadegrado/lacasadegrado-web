"use client";

import { useQuery } from "@tanstack/react-query";

import { CART_QUERY_KEYS } from "@/common/lib/constants";

import { fetchCartItemsAction } from "../actions/cart.action";
import { useCart } from "./use-cart.hook";

/**
 * Cart lines resolved on the server for the ids in the store. Ids the
 * viewer cannot buy are pruned from the store so they never linger.
 */
export function useCartItems() {
  const { photoIds, hydrated, remove } = useCart();

  const query = useQuery({
    queryKey: CART_QUERY_KEYS.items(photoIds),
    queryFn: async () => {
      const result = await fetchCartItemsAction(photoIds);
      for (const id of result.unavailableIds) remove(id);
      return result;
    },
    enabled: hydrated && photoIds.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    hydrated,
    photoIds,
    items: photoIds.length === 0 ? [] : (query.data?.items ?? []),
    isLoading: hydrated && photoIds.length > 0 && query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
