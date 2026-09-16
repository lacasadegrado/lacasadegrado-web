import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { citext } from "./citext.type";
import { events } from "./events.table";

/**
 * SECURITY: `original_key` is server-only. It must never be selected into
 * a client payload, server component prop, API response or React state.
 * Services expose explicit column picks; never `select()` the whole row
 * on a path that reaches the browser.
 */
export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    originalKey: text("original_key").notNull(),
    previewKey: text("preview_key").notNull(),
    /**
     * Clean 1400px derivative (no blur, no watermark) shown on the
     * purchases page. Gated by entitlement. Nullable only for photos
     * ingested before it existed; see scripts/backfill-clean-previews.mts.
     */
    cleanKey: text("clean_key"),
    /** Name of the uploaded file, so bulk CSV tagging can match by it. */
    originalFilename: text("original_filename").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** Digital download, integer EUR cents. Bolívar amounts are derived at display time. */
    priceCents: integer("price_cents").notNull(),
    /** Printed copy, integer EUR cents. Buying the print includes the digital file. */
    printPriceCents: integer("print_price_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("photos_event_id_idx").on(t.eventId),
    index("photos_event_id_original_filename_idx").on(t.eventId, t.originalFilename),
  ],
).enableRLS();

/**
 * How a photo reaches a person. Admin tags each photo with one or more
 * emails; a user's gallery is every photo tagged with their session email.
 * Email is normalized to lowercase before insert; citext makes the unique
 * constraint case-insensitive regardless.
 */
export const photoTags = pgTable(
  "photo_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    /** Optional institution-issued student id, for future matching. */
    studentId: text("student_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("photo_tags_photo_id_email_uq").on(t.photoId, t.email),
    index("photo_tags_email_idx").on(t.email),
  ],
).enableRLS();

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type PhotoTag = typeof photoTags.$inferSelect;
export type NewPhotoTag = typeof photoTags.$inferInsert;
