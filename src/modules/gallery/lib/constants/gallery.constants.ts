/** Presigned preview URLs live this long (security rule 4). */
export const PREVIEW_URL_TTL_SECONDS = 15 * 60;

export const GALLERY_PATHS = {
  dashboard: "/dashboard",
  purchases: "/dashboard/purchases",
  previewApi: (photoId: string) => `/api/photos/${photoId}/preview`,
} as const;
