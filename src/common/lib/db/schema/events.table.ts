import { boolean, date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** A graduation ceremony or session the photographer shot. */
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  institution: text("institution").notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
