/** "Promoción 2026 · UCAB" -> "promocion-2026-ucab". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Default slug for an event: name plus year, so reruns stay unique. */
export function eventSlug(name: string, eventDate: string): string {
  const year = eventDate.slice(0, 4);
  const base = slugify(name);
  if (!base) return year;
  return base.includes(year) ? base : slugify(`${base} ${year}`);
}
