import type { PhotoFormat } from "@/common/lib/db/schema";

/** What the browser keeps: which photo, in which format. Nothing else is trusted. */
export type CartLineInput = {
  photoId: string;
  format: PhotoFormat;
};

/** A cart line as resolved on the server. No storage keys. */
export type CartItem = {
  id: string;
  width: number;
  height: number;
  /** Digital download price. */
  priceCents: number;
  /** Printed copy price; includes the digital file. */
  printPriceCents: number;
  /** What the person chose for this photo. */
  format: PhotoFormat;
  /** Price of the chosen format, straight from the DB. */
  unitPriceCents: number;
  eventName: string;
  /** Already entitled to the digital file; cannot be bought again. */
  owned: boolean;
};

export type CartItemsResult = {
  items: CartItem[];
  /** Requested ids the viewer cannot buy (not tagged, inactive event, unknown). */
  unavailableIds: string[];
};
