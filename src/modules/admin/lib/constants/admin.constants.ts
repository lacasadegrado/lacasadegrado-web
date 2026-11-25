export const ADMIN_PATHS = {
  root: "/admin",
  events: "/admin/events",
  eventForms: "/admin/events/forms",
  eventFormsFor: (eventId: string) => `/admin/events/forms?event=${eventId}`,
  formBuilder: (formId: string) => `/admin/events/forms/${formId}`,
  roster: (rosterId: string) => `/admin/events/forms/rosters/${rosterId}`,
  formResponses: (formId: string) => `/admin/events/forms/${formId}/responses`,
  formResponse: (formId: string, submissionId: string) =>
    `/admin/events/forms/${formId}/responses/${submissionId}`,
  photos: "/admin/photos",
  /** An event's folders, or one folder inside it (`PHOTO_FOLDERS` or a tagged email). */
  photoFolder: (eventId: string, folder?: string) =>
    folder
      ? `/admin/photos?event=${eventId}&carpeta=${encodeURIComponent(folder)}`
      : `/admin/photos?event=${eventId}`,
  photoSearch: (query: string) => `/admin/photos?buscar=${encodeURIComponent(query)}`,
  payments: "/admin/payments",
  packagePayments: "/admin/payments/packages",
  packagePayment: (submissionId: string) => `/admin/payments/packages/${submissionId}`,
  packagePlans: "/admin/payments/plans",
  packagePlan: (planId: string) => `/admin/payments/plans/${planId}`,
  packagePlanReceipt: (planId: string) => `/admin/payments/plans/${planId}/receipt`,
  packagePaymentFileApi: (submissionId: string, fieldId: string, index: number) =>
    `/api/admin/package-payments/${submissionId}/files/${fieldId}/${index}`,
  packagePaymentsExportApi: "/api/admin/package-payments/export",
  sales: "/admin/sales",
  sale: (orderId: string) => `/admin/sales/${orderId}`,
  prints: "/admin/prints",
  rates: "/admin/rates",
  paymentMethods: "/admin/payment-methods",
  paymentForm: "/admin/payment-form",
  users: "/admin/users",
  user: (profileId: string) => `/admin/users/${profileId}`,
  paymentProofApi: (paymentId: string) => `/api/admin/payments/${paymentId}/proof`,
} as const;

/**
 * The two folders of an event that are not a person. Any other `carpeta`
 * value is a tagged email; neither of these contains an "@".
 */
export const PHOTO_FOLDERS = {
  untagged: "sin-etiquetar",
  all: "todas",
} as const;

export const PHOTO_UPLOAD = {
  /** Per file. Camera JPEGs are typically 5-15 MB. */
  maxBytes: 60 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  /** For the file input `accept` attribute. */
  accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  /** Parallel uploads from the browser. */
  concurrency: 2,
  /** How long a presigned PUT stays valid; covers a slow 60 MB upload. */
  uploadUrlTtlSeconds: 15 * 60,
} as const;

/** Preview derivative, generated once at ingest (security rule 7). */
export const PREVIEW_DERIVATIVE = {
  maxEdge: 1400,
  /**
   * 0 = no blur, since 2026-10-21: the blur did not help sell (12 until
   * 2026-09-30, then 5). The dense watermark is the only protection now.
   * sharp's minimum is 0.3, so anything below that skips the blur.
   * Existing previews are regenerated with `npm run photos:regenerate-previews`.
   */
  blurSigma: 0,
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
/** Digital download, EUR cents. */
export const DEFAULT_PHOTO_PRICE_CENTS = 500;
/** Printed copy (includes the digital file), EUR cents. */
export const DEFAULT_PRINT_PRICE_CENTS = 700;

/** Selection-based bulk actions on the photo grid. */
export const BULK_LIMITS = {
  maxPhotos: 500,
  maxEmails: 50,
} as const;
