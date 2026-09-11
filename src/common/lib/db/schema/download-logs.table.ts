import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { photos } from "./photos.table";
import { profiles } from "./profiles.table";

/** One row per presigned download URL issued. */
export const downloadLogs = pgTable(
  "download_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("download_logs_profile_id_photo_id_idx").on(t.profileId, t.photoId)],
).enableRLS();

export type DownloadLog = typeof downloadLogs.$inferSelect;
export type NewDownloadLog = typeof downloadLogs.$inferInsert;
