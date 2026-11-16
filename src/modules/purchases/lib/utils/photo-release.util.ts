import { sql, type SQL } from "drizzle-orm";

import { packagePlans, photoReleases, photos } from "@/common/lib/db/schema";

/** The email has a payment plan in the photo's event with this status. */
function planInEvent(email: string, status: "open" | "paid"): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${packagePlans}
    where ${packagePlans.eventId} = ${photos.eventId}
      and ${packagePlans.email} = ${email}
      and ${packagePlans.status} = ${status}
  )`;
}

/**
 * True when the photo is released for this email: for everyone tagged in
 * it (`photos.released_at`), for this email alone (`photo_releases`), or
 * because it is a package photo ("Del paquete") and their payment plan in
 * that event is paid in full.
 *
 * Only meaningful next to a `photo_tags.email = email` condition: a
 * release never reaches someone who is not tagged on the photo. Every
 * caller joins the tags; keep it that way.
 */
export function releasedForEmail(email: string): SQL<boolean> {
  return sql<boolean>`(${photos.releasedAt} is not null or exists (
    select 1 from ${photoReleases}
    where ${photoReleases.photoId} = ${photos.id} and ${photoReleases.email} = ${email}
  ) or (${photos.isPackage} and ${planInEvent(email, "paid")}))`;
}

/**
 * A package photo of someone still paying their plan: it will be theirs
 * when the plan is paid, so it is not for sale to them meanwhile (no
 * paying twice). Same tag rule as `releasedForEmail`.
 */
export function packagePendingForEmail(email: string): SQL<boolean> {
  return sql<boolean>`(${photos.isPackage} and ${planInEvent(email, "open")} and not ${releasedForEmail(email)})`;
}
