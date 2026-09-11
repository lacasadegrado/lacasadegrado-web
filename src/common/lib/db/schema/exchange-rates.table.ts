import { index, numeric, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles.table";

export const exchangeRateSourceEnum = pgEnum("exchange_rate_source", [
  "manual",
  "dolarapi_oficial",
  "dolarapi_paralelo",
]);

/**
 * USD to VES rate. Append-only: checkout reads the latest row by
 * `effective_at` and snapshots it onto the order. Rows are either set by
 * an admin (`manual`, with `created_by`) or fetched automatically from
 * DolarApi when the latest row is stale (`created_by` null).
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usdToVes: numeric("usd_to_ves", { precision: 14, scale: 4 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: exchangeRateSourceEnum("source").notNull().default("manual"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("exchange_rates_effective_at_idx").on(t.effectiveAt)],
).enableRLS();

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type ExchangeRateSource = (typeof exchangeRateSourceEnum.enumValues)[number];
