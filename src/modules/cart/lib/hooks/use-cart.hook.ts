"use client";

import { useShallow } from "zustand/react/shallow";

import type { PhotoFormat } from "@/common/lib/db/schema";

import { useCartStore } from "../stores/cart.store";

/** Cart facade for components. Selectors keep re-renders scoped. */
export function useCart() {
  return useCartStore(
    useShallow((state) => ({
      lines: state.lines,
      count: state.lines.length,
      hydrated: state.hydrated,
      add: state.add,
      remove: state.remove,
      clear: state.clear,
    })),
  );
}

/** The format this photo sits in the cart with, or null when it is not there. */
export function useCartFormat(photoId: string): PhotoFormat | null {
  return useCartStore(
    (state) => state.lines.find((line) => line.photoId === photoId)?.format ?? null,
  );
}

export function useIsInCart(photoId: string): boolean {
  return useCartStore((state) => state.lines.some((line) => line.photoId === photoId));
}
