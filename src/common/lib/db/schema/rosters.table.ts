import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { events } from "./events.table";

/**
 * A list of people uploaded by the admin for an event (graduates, tutors,
 * coordinators), from an Excel, CSV or pasted cells. A form linked to it
 * lets each person pick their name and see their row prefilled. The list
 * stays as uploaded: answers keep their own values. `columns` holds the
 * column definitions (`{ key, label }[]`), typed `unknown` so every read
 * goes through the Zod schema in the forms module.
 */
export const rosters = pgTable(
  "rosters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Restrict: an event with lists cannot be deleted by accident. */
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    columns: jsonb("columns").$type<unknown>().notNull(),
    /** File of the last import, to tell versions apart. */
    sourceName: text("source_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("rosters_event_id_idx").on(t.eventId)],
).enableRLS();

/**
 * One person of a list. `name_key` is the name without accents, case or
 * repeated spaces: re-imports update people by it. `values` maps column
 * key to the cell text (`Record<string, string>`), parsed on read.
 */
export const rosterEntries = pgTable(
  "roster_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => rosters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    values: jsonb("values").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("roster_entries_roster_id_name_key_idx").on(t.rosterId, t.nameKey)],
).enableRLS();

export type Roster = typeof rosters.$inferSelect;
export type RosterEntry = typeof rosterEntries.$inferSelect;
