"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { CART_MAX_ITEMS, CART_STORAGE_KEY } from "../constants/cart.constants";

/**
 * The cart is photo ids only, persisted in localStorage. Prices and
 * ownership are never trusted from here: checkout re-reads both on the
 * server. `hydrated` lets components render a neutral state during SSR
 * and the first client paint, before localStorage has been read.
 */
type CartState = {
  photoIds: string[];
  hydrated: boolean;
  add: (photoId: string) => void;
  remove: (photoId: string) => void;
  toggle: (photoId: string) => void;
  clear: () => void;
  markHydrated: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      photoIds: [],
      hydrated: false,
      add: (photoId) => {
        const { photoIds } = get();
        if (photoIds.includes(photoId) || photoIds.length >= CART_MAX_ITEMS) return;
        set({ photoIds: [...photoIds, photoId] });
      },
      remove: (photoId) =>
        set({ photoIds: get().photoIds.filter((id) => id !== photoId) }),
      toggle: (photoId) => {
        if (get().photoIds.includes(photoId)) get().remove(photoId);
        else get().add(photoId);
      },
      clear: () => set({ photoIds: [] }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ photoIds: state.photoIds }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
