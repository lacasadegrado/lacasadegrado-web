/**
 * What the gallery renders. No storage keys of any kind: previews load
 * through the gated route by photo id.
 */
export type GalleryPhoto = {
  id: string;
  width: number;
  height: number;
  priceCents: number;
  /** The viewer already holds an entitlement for this photo. */
  owned: boolean;
};

export type GalleryEvent = {
  id: string;
  name: string;
  institution: string;
  /** YYYY-MM-DD */
  eventDate: string;
  photos: GalleryPhoto[];
};

/**
 * How cards behave for this viewer. `buy` is the normal customer flow;
 * the other two are granted by an admin in Personas.
 */
export type GalleryMode = "buy" | "free-view" | "free-download";
