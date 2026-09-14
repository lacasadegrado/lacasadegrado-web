export const ADMIN_PATHS = {
  root: "/admin",
  events: "/admin/events",
  photos: "/admin/photos",
  payments: "/admin/payments",
  rates: "/admin/rates",
  users: "/admin/users",
  user: (profileId: string) => `/admin/users/${profileId}`,
  paymentProofApi: (paymentId: string) => `/api/admin/payments/${paymentId}/proof`,
} as const;

export const PHOTO_UPLOAD = {
  /** Per file. Camera JPEGs are typically 5-15 MB. */
  maxBytes: 60 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  /** For the file input `accept` attribute. */
  accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  /** Parallel uploads from the browser. */
  concurrency: 2,
} as const;

/** Preview derivative, generated once at ingest (security rule 7). */
export const PREVIEW_DERIVATIVE = {
  maxEdge: 1400,
  blurSigma: 12,
  webpQuality: 70,
} as const;

/** Post-purchase derivative: same resize as the preview, nothing applied. */
export const CLEAN_DERIVATIVE = {
  webpQuality: 82,
} as const;

export const STORAGE_PREFIXES = {
  originals: "originals",
  previews: "previews",
  clean: "clean",
  proofs: "proofs",
} as const;

/**
 * Assumption (brief, open decision 1): flat price per photo, editable per
 * upload batch. $5.00 is a placeholder until the business sets it.
 */
export const DEFAULT_PHOTO_PRICE_CENTS = 500;

/** Selection-based bulk actions on the photo grid. */
export const BULK_LIMITS = {
  maxPhotos: 500,
  maxEmails: 50,
} as const;
