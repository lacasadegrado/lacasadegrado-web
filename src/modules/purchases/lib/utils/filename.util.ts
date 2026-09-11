/**
 * Content-Disposition with both the ASCII fallback and the RFC 5987
 * UTF-8 form, so accented filenames survive every browser.
 */
export function attachmentDisposition(filename: string): string {
  const safe = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

/** Strips path separators and control characters from a name used inside a zip. */
export function zipSafeName(filename: string): string {
  const cleaned = filename.replace(/[\\/\x00-\x1f]/g, "_").trim();
  return cleaned || "foto";
}

/** "IMG_1.jpg", "IMG_1.jpg" -> "IMG_1.jpg", "IMG_1 (2).jpg" */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0
      ? `${name.slice(0, dot)} (${count})${name.slice(dot)}`
      : `${name} (${count})`;
  });
}
