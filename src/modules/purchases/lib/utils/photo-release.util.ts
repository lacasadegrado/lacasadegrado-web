import { sql, type SQL } from "drizzle-orm";

import { photoReleases, photos } from "@/common/lib/db/schema";

/**
 * True when the photo is released for this email: for everyone tagged in
 * it (`photos.released_at`) or for this email alone (`photo_releases`).
 *
 * Only meaningful next to a `photo_tags.email = email` condition: a
 * release never reaches someone who is not tagged on the photo. Every
 * caller joins the tags; keep it that way.
 */
export function releasedForEmail(email: string): SQL<boolean> {
  return sql<boolean>`(${photos.releasedAt} is not null or exists (
    select 1 from ${photoReleases}
    where ${photoReleases.photoId} = ${photos.id} and ${photoReleases.email} = ${email}
  ))`;
}
