"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PhotoFormat } from "@/common/lib/db/schema";

import { CART_MAX_ITEMS, CART_STORAGE_KEY } from "../constants/cart.constants";
import type { CartLineInput } from "../types/cart.types";

/**
 * The cart is photo ids plus the chosen format, persisted in
 * localStorage. Prices and ownership are never trusted from here:
 * checkout re-reads both on the server. One line per photo: a print
 * already includes the digital file, so the two formats never coexist.
 * `hydrated` lets components render a neutral state during SSR and the
 * first client paint, before localStorage has been read.
 */
type CartState = {
  lines: CartLineInput[];
  hydrated: boolean;
  /** Adds the photo, or switches its format if it is already in the cart. */
  add: (photoId: string, format: PhotoFormat) => void;
  remove: (photoId: string) => void;
  clear: () => void;
  markHydrated: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,
      add: (photoId, format) => {
        const { lines } = get();
        const existing = lines.find((line) => line.photoId === photoId);
        if (existing) {
          if (existing.format === format) return;
          set({
            lines: lines.map((line) => (line.photoId === photoId ? { photoId, format } : line)),
          });
          return;
        }
        if (lines.length >= CART_MAX_ITEMS) return;
        set({ lines: [...lines, { photoId, format }] });
      },
      remove: (photoId) => set({ lines: get().lines.filter((line) => line.photoId !== photoId) }),
      clear: () => set({ lines: [] }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
