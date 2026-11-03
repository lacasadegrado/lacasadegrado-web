import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext.type";
import { packagePlanStatusEnum } from "./enums.table";
import { events } from "./events.table";
import { forms } from "./forms.table";
import { photoPackages } from "./photo-packages.table";

/**
 * One person paying one package, possibly in several abonos. Created by
 * the first payment through a package form; later payments come through
 * the plan's private link (`/abono/<token>`), so the person never retypes
 * their data. Only the SHA-256 of the token is stored: a lost link is
 * replaced by a new one, never recovered. Balances come from the
 * confirmed `form_submissions` of the plan.
 */
export const packagePlans = pgTable(
  "package_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => photoPackages.id, { onDelete: "restrict" }),
    /** The form of the first payment; abonos reuse its reference and proof fields. */
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    /** Null when the form's email field was optional and left empty. */
    email: citext("email"),
    personName: text("person_name"),
    /** Snapshots: the package can be renamed or repriced later. */
    packageName: text("package_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    installments: integer("installments").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: packagePlanStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("package_plans_package_id_email_idx").on(t.packageId, t.email),
    index("package_plans_event_id_status_idx").on(t.eventId, t.status),
  ],
).enableRLS();

export type PackagePlan = typeof packagePlans.$inferSelect;
export type NewPackagePlan = typeof packagePlans.$inferInsert;
