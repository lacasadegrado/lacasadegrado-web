/** A photo the viewer owns. No storage keys. */
export type PurchasedPhoto = {
  id: string;
  width: number;
  height: number;
  originalFilename: string;
  grantedAt: Date;
};

export type PurchasedEvent = {
  id: string;
  name: string;
  institution: string;
  /** YYYY-MM-DD */
  eventDate: string;
  photos: PurchasedPhoto[];
};
