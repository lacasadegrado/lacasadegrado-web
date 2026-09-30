import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext.type";
import { formStatusEnum } from "./enums.table";
import { events } from "./events.table";
import { photoPackages } from "./photo-packages.table";
import { profiles } from "./profiles.table";

/**
 * An admin-built form with a public link (`/f/<slug>`, no login) where
 * people report the payment of a prepaid package. `fields` holds the
 * field definitions; it is typed `unknown` on purpose so every read goes
 * through the Zod schema in the forms module.
 */
export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Restrict: an event with forms cannot be deleted by accident. */
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Public, unguessable path segment. */
    slug: text("slug").notNull().unique(),
    status: formStatusEnum("status").notNull().default("draft"),
    fields: jsonb("fields").$type<unknown>().notNull(),
    /** Bumped whenever `fields` changes; submissions record the one they saw. */
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("forms_event_id_idx").on(t.eventId)],
).enableRLS();

/**
 * One filled form. Read-only for the admin (listed and exported to
 * Excel); it grants nothing. The system fields are copied to columns for
 * filtering; `answers` has every answer keyed by field id, and
 * `fields_snapshot` the definitions the person saw, so editing the form
 * later never breaks old answers. File answers hold R2 keys under
 * `forms/`: server-only, like `original_key`.
 */
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Restrict: a form with answers cannot be deleted, only closed. */
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => photoPackages.id, { onDelete: "restrict" }),
    /** Snapshots: the package can be renamed or repriced later. */
    packageName: text("package_name").notNull(),
    packagePriceCents: integer("package_price_cents").notNull(),
    email: citext("email").notNull(),
    reference: text("reference").notNull(),
    /** R2 key of the payment proof. Server-only. */
    proofKey: text("proof_key").notNull(),
    answers: jsonb("answers").$type<unknown>().notNull(),
    fieldsSnapshot: jsonb("fields_snapshot").$type<unknown>().notNull(),
    formVersion: integer("form_version").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("form_submissions_form_id_submitted_at_idx").on(t.formId, t.submittedAt),
    index("form_submissions_package_id_idx").on(t.packageId),
    index("form_submissions_email_idx").on(t.email),
  ],
).enableRLS();

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;
