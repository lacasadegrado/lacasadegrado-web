import "server-only";

import { and, asc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { formSubmissions, forms, photoTags, photos } from "@/common/lib/db/schema";
import { formFieldsSchema } from "@/modules/forms/lib/schemas/form-field.schema";
import { personNameFrom } from "@/modules/forms/lib/utils/person-name.util";

import type { EmailSuggestion } from "../types/admin.types";

/**
 * Emails to suggest when tagging an event's photos: every email already
 * tagged in the event plus every email the event's forms collected, with
 * the person's name when a form had a name field. When one person answered
 * several times, the newest name wins. Suggestions only: nothing here
 * creates people (Personas) or tags.
 */
export async function listEmailSuggestionsForEvent(eventId: string): Promise<EmailSuggestion[]> {
  const [tagged, submitted] = await Promise.all([
    db
      .selectDistinct({ email: photoTags.email })
      .from(photoTags)
      .innerJoin(photos, eq(photos.id, photoTags.photoId))
      .where(eq(photos.eventId, eventId)),
    db
      .select({
        email: formSubmissions.email,
        answers: formSubmissions.answers,
        fieldsSnapshot: formSubmissions.fieldsSnapshot,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(forms.id, formSubmissions.formId))
      .where(and(eq(forms.eventId, eventId), isNotNull(formSubmissions.email)))
      .orderBy(asc(formSubmissions.submittedAt)),
  ]);

  const byEmail = new Map<string, string | null>();
  for (const row of tagged) byEmail.set(row.email.toLowerCase(), null);
  for (const row of submitted) {
    if (!row.email) continue;
    const email = row.email.toLowerCase();
    const fields = formFieldsSchema.safeParse(row.fieldsSnapshot);
    const answers = typeof row.answers === "object" && row.answers !== null ? (row.answers as Record<string, unknown>) : {};
    const name = fields.success ? personNameFrom(fields.data, answers) : null;
    // Ascending order: a later answer overwrites the name; a nameless one keeps the old name.
    byEmail.set(email, name ?? byEmail.get(email) ?? null);
  }

  return [...byEmail.entries()]
    .map(([email, name]) => ({ email, name }))
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "es"));
}
