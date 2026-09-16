export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type AdminEvent = {
  id: string;
  name: string;
  institution: string;
  /** YYYY-MM-DD */
  eventDate: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  photoCount: number;
};

export type AdminPhotoTag = {
  id: string;
  email: string;
};

/**
 * What the admin UI sees for a photo. Deliberately has no storage keys:
 * previews are fetched through the gated preview route.
 */
export type AdminPhoto = {
  id: string;
  originalFilename: string;
  width: number;
  height: number;
  /** Digital download, EUR cents. */
  priceCents: number;
  /** Printed copy, EUR cents. */
  printPriceCents: number;
  createdAt: Date;
  /** Entitlements granted for this photo (people who bought it). */
  soldCount: number;
  tags: AdminPhotoTag[];
};

/** Outcome of a selection-based bulk action. */
export type BulkActionResult = {
  /** Photos (or tags) actually changed. */
  affected: number;
  /** Rows that already had the value and were left alone. */
  skipped: number;
  /** Filenames that could not be changed (e.g. photos in an order). */
  blocked: string[];
  /** Inputs that did not validate (e.g. malformed emails). */
  invalid: string[];
};

export type BulkActionOutcome =
  | { ok: true; result: BulkActionResult; message: string }
  | { ok: false; message: string };

export type UploadResponse =
  | { ok: true; id: string; filename: string }
  | { ok: false; error: string };
