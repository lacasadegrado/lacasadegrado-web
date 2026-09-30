import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { events } from "./events.table";

/**
 * A prepaid photo package sold for an event before it happens ("fotos
 * garantizadas"). Every form of the event offers its active packages in
 * the package select. Price in EUR cents, like `photos.price_cents`.
 */
export const photoPackages = pgTable(
  "photo_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Restrict: an event with packages cannot be deleted by accident. */
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    /** Inactive packages leave the select but keep their submissions. */
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("photo_packages_event_id_idx").on(t.eventId)],
).enableRLS();

export type PhotoPackage = typeof photoPackages.$inferSelect;
export type NewPhotoPackage = typeof photoPackages.$inferInsert;
