import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import {
  entitlements,
  events,
  formSubmissions,
  forms,
  packagePlans,
  photoTags,
  photos,
  profiles,
} from "@/common/lib/db/schema";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import { personNameFrom } from "@/modules/forms/lib/utils/person-name.util";

import type {
  EmailSuggestion,
  PersonPhotoFolder,
  PersonSearchHit,
  PhotoEventFolder,
} from "../types/admin.types";
import { foldSearchText } from "../utils/search-text.util";
import { listEvents } from "./event.service";

/** How many people the search across events shows at most. */
const SEARCH_LIMIT = 60;

/**
 * Folders are not stored anywhere: an event is a folder, and inside it
 * each tagged email is a person's folder (a group photo sits in every
 * tagged person's folder, like a Drive shortcut). Everything here reads
 * `photo_tags`; nothing writes.
 */
export async function listEventFolders(): Promise<PhotoEventFolder[]> {
  const [eventRows, photoStats, peopleStats] = await Promise.all([
    listEvents(),
    db
      .select({
        eventId: photos.eventId,
        coverPhotoId: sql<string>`(array_agg(${photos.id} order by ${photos.createdAt}, ${photos.originalFilename}))[1]`,
        untaggedCount: sql<number>`count(*) filter (where not exists (select 1 from ${photoTags} where ${photoTags.photoId} = ${photos.id}))::int`,
      })
      .from(photos)
      .groupBy(photos.eventId),
    db
      .select({
        eventId: photos.eventId,
        peopleCount: sql<number>`count(distinct ${photoTags.email})::int`,
      })
      .from(photoTags)
      .innerJoin(photos, eq(photos.id, photoTags.photoId))
      .groupBy(photos.eventId),
  ]);

  const statsByEvent = new Map(photoStats.map((row) => [row.eventId, row]));
  const peopleByEvent = new Map(peopleStats.map((row) => [row.eventId, row.peopleCount]));

  return eventRows.map((event) => ({
    ...event,
    coverPhotoId: statsByEvent.get(event.id)?.coverPhotoId ?? null,
    untaggedCount: statsByEvent.get(event.id)?.untaggedCount ?? 0,
    peopleCount: peopleByEvent.get(event.id) ?? 0,
  }));
}

/**
 * One folder per email tagged in the event, sorted by name (or email when
 * there is no name). `suggestions` are the event's tagging suggestions,
 * which already carry the names the forms collected.
 */
export async function listPersonFolders(
  eventId: string,
  suggestions: EmailSuggestion[],
): Promise<PersonPhotoFolder[]> {
  const [folders, bought, plans] = await Promise.all([
    db
      .select({
        email: photoTags.email,
        photoCount: sql<number>`count(*)::int`,
        coverPhotoId: sql<string>`(array_agg(${photos.id} order by ${photos.originalFilename}, ${photos.createdAt}))[1]`,
      })
      .from(photoTags)
      .innerJoin(photos, eq(photos.id, photoTags.photoId))
      .where(eq(photos.eventId, eventId))
      .groupBy(photoTags.email),
    db
      .select({ email: profiles.email, count: sql<number>`count(*)::int` })
      .from(entitlements)
      .innerJoin(photos, eq(photos.id, entitlements.photoId))
      .innerJoin(profiles, eq(profiles.id, entitlements.profileId))
      .where(eq(photos.eventId, eventId))
      .groupBy(profiles.email),
    db
      .select({
        email: packagePlans.email,
        paid: sql<boolean>`bool_or(${packagePlans.status} = 'paid')`,
      })
      .from(packagePlans)
      .where(and(eq(packagePlans.eventId, eventId), isNotNull(packagePlans.email)))
      .groupBy(packagePlans.email),
  ]);

  if (folders.length === 0) return [];

  const names = await profileNames(folders.map((folder) => folder.email));
  for (const suggestion of suggestions) {
    if (suggestion.name) names.set(suggestion.email.toLowerCase(), suggestion.name);
  }
  const boughtByEmail = new Map(bought.map((row) => [row.email.toLowerCase(), row.count]));
  const planByEmail = new Map(
    plans.flatMap((row) => (row.email ? [[row.email.toLowerCase(), row.paid ? "paid" : "open"] as const] : [])),
  );

  return folders
    .map((folder) => {
      const email = folder.email.toLowerCase();
      return {
        email,
        name: names.get(email) ?? null,
        photoCount: folder.photoCount,
        coverPhotoId: folder.coverPhotoId,
        boughtCount: boughtByEmail.get(email) ?? 0,
        plan: planByEmail.get(email) ?? null,
      };
    })
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "es"));
}

/**
 * "A customer says their photo is missing": finds their folders in every
 * event by name or email, ignoring accents and case. Names come from
 * Personas and from what the forms collected.
 */
export async function searchPersonFolders(query: string): Promise<PersonSearchHit[]> {
  const needle = foldSearchText(query);
  if (needle.length < 2) return [];

  const [folders, submissions] = await Promise.all([
    db
      .select({
        email: photoTags.email,
        eventId: events.id,
        eventName: events.name,
        institution: events.institution,
        photoCount: sql<number>`count(*)::int`,
        coverPhotoId: sql<string>`(array_agg(${photos.id} order by ${photos.originalFilename}, ${photos.createdAt}))[1]`,
        profileName: sql<string | null>`max(${profiles.fullName})`,
      })
      .from(photoTags)
      .innerJoin(photos, eq(photos.id, photoTags.photoId))
      .innerJoin(events, eq(events.id, photos.eventId))
      .leftJoin(profiles, eq(profiles.email, photoTags.email))
      .groupBy(photoTags.email, events.id),
    db
      .select({
        email: formSubmissions.email,
        answers: formSubmissions.answers,
        fieldsSnapshot: formSubmissions.fieldsSnapshot,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(forms.id, formSubmissions.formId))
      .where(isNotNull(formSubmissions.email))
      .orderBy(formSubmissions.submittedAt),
  ]);

  // Ascending order: a later answer's name wins, as in the tagging suggestions.
  const formNames = new Map<string, string>();
  for (const row of submissions) {
    if (!row.email) continue;
    const fields = formFieldsSchema.safeParse(row.fieldsSnapshot);
    const answers =
      typeof row.answers === "object" && row.answers !== null ? (row.answers as Record<string, unknown>) : {};
    const name = fields.success ? personNameFrom(fields.data, answers) : null;
    if (name) formNames.set(row.email.toLowerCase(), name);
  }

  return folders
    .map((folder) => {
      const email = folder.email.toLowerCase();
      return {
        email,
        name: formNames.get(email) ?? folder.profileName ?? null,
        eventId: folder.eventId,
        eventName: folder.eventName,
        institution: folder.institution,
        photoCount: folder.photoCount,
        coverPhotoId: folder.coverPhotoId,
      };
    })
    .filter((hit) => hit.email.includes(needle) || (hit.name ? foldSearchText(hit.name).includes(needle) : false))
    .sort(
      (a, b) =>
        (a.name ?? a.email).localeCompare(b.name ?? b.email, "es") || a.eventName.localeCompare(b.eventName, "es"),
    )
    .slice(0, SEARCH_LIMIT);
}

/** The name shown on one person's folder: the forms' name, else Personas'. */
export async function personFolderName(email: string, suggestions: EmailSuggestion[]): Promise<string | null> {
  const fromForms = suggestions.find((item) => item.email.toLowerCase() === email)?.name;
  if (fromForms) return fromForms;
  return (await profileNames([email])).get(email) ?? null;
}

async function profileNames(emails: string[]): Promise<Map<string, string>> {
  const rows = await db
    .select({ email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(and(inArray(profiles.email, emails), isNotNull(profiles.fullName)));
  return new Map(rows.flatMap((row) => (row.fullName ? [[row.email.toLowerCase(), row.fullName] as const] : [])));
}
