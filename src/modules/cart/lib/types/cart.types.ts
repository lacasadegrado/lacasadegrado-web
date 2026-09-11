/** A cart line as resolved on the server. No storage keys. */
export type CartItem = {
  id: string;
  width: number;
  height: number;
  priceCents: number;
  eventName: string;
  /** Already entitled; cannot be bought again. */
  owned: boolean;
};

export type CartItemsResult = {
  items: CartItem[];
  /** Requested ids the viewer cannot buy (not tagged, inactive event, unknown). */
  unavailableIds: string[];
};
