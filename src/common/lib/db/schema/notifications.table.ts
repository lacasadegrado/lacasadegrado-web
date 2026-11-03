import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { notificationKindEnum } from "./enums.table";
import { profiles } from "./profiles.table";

/**
 * In-app notifications for admins (the bell in the admin header), instead
 * of emails piling up in an inbox. One row per admin, so each one reads
 * and clears their own.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Admin page that deals with it. */
    href: text("href").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("notifications_profile_id_created_at_idx").on(t.profileId, t.createdAt)],
).enableRLS();

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
