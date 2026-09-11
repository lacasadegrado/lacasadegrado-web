"use client";

import { useShallow } from "zustand/react/shallow";

import { useCartStore } from "../stores/cart.store";

/** Cart facade for components. Selectors keep re-renders scoped. */
export function useCart() {
  return useCartStore(
    useShallow((state) => ({
      photoIds: state.photoIds,
      count: state.photoIds.length,
      hydrated: state.hydrated,
      add: state.add,
      remove: state.remove,
      toggle: state.toggle,
      clear: state.clear,
    })),
  );
}

export function useIsInCart(photoId: string): boolean {
  return useCartStore((state) => state.photoIds.includes(photoId));
}
