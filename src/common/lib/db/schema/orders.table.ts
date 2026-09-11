import { sql } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authenticatedRole } from "drizzle-orm/supabase";

import { orderStatusEnum, paymentMethodEnum } from "./enums.table";
import { photos } from "./photos.table";
import { profiles } from "./profiles.table";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    /** Always recomputed server-side from photos.price_cents. */
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    /** USD to VES rate snapshotted at checkout. Null if none was set. */
    exchangeRate: numeric("exchange_rate", { precision: 14, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_profile_id_idx").on(t.profileId),
    index("orders_status_idx").on(t.status),
    pgPolicy("orders_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.profileId}`,
    }),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "restrict" }),
    /** Price snapshot at order time. Never read the live photo price. */
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [
    uniqueIndex("order_items_order_id_photo_id_uq").on(t.orderId, t.photoId),
    pgPolicy("order_items_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from ${orders}
        where ${orders.id} = ${t.orderId}
          and ${orders.profileId} = ${authUid}
      )`,
    }),
  ],
).enableRLS();

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
