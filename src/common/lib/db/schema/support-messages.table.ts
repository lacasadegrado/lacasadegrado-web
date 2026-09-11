import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext.type";
import { supportChannelEnum, supportStatusEnum } from "./enums.table";
import { profiles } from "./profiles.table";

/**
 * Every support contact, whether it came through the form or the
 * WhatsApp deep link, so nothing is lost.
 */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: citext("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    channel: supportChannelEnum("channel").notNull(),
    status: supportStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_messages_status_idx").on(t.status)],
).enableRLS();

export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
