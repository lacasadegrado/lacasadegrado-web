export const PURCHASES_PATHS = {
  purchases: "/dashboard/purchases",
  downloadApi: (photoId: string) => `/api/photos/${photoId}/download`,
  viewApi: (photoId: string) => `/api/photos/${photoId}/view`,
  downloadAllApi: "/api/purchases/download-all",
} as const;

/** Security rule 5: the original's presigned URL lives one minute. */
export const DOWNLOAD_URL_TTL_SECONDS = 60;

/** Clean preview on the purchases page; same TTL as the blurred preview. */
export const VIEW_URL_TTL_SECONDS = 15 * 60;

export const ZIP_FILENAME = "la-casa-de-grado-fotos.zip";
