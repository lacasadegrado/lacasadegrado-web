import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUid, authenticatedRole } from "drizzle-orm/supabase";

import { orders } from "./orders.table";
import { photos } from "./photos.table";
import { profiles } from "./profiles.table";

/**
 * The single source of truth for "can this user download this file".
 * Created when an admin marks an order paid. Download rights are never
 * derived by joining orders at request time.
 */
export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("entitlements_profile_id_photo_id_uq").on(t.profileId, t.photoId),
    index("entitlements_profile_id_idx").on(t.profileId),
    pgPolicy("entitlements_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.profileId}`,
    }),
  ],
).enableRLS();

export type Entitlement = typeof entitlements.$inferSelect;
export type NewEntitlement = typeof entitlements.$inferInsert;
