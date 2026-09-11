const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** File extension for an accepted image MIME type; "bin" for anything else. */
export function extensionForImageType(contentType: string): string {
  return IMAGE_EXTENSION_BY_TYPE[contentType] ?? "bin";
}
