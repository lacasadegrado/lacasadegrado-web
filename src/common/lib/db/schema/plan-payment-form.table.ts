import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, smallint, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles.table";

/**
 * The questions every package installment asks in "Pagos", edited by the
 * admin in Configuración › Formulario de pagos. One row (id = 1); without
 * it the default questions apply (reference + proof). `fields` is typed
 * `unknown`: every read parses it with the forms module's schema. Each
 * payment keeps its own copy in `form_submissions.fields_snapshot`.
 */
export const planPaymentForm = pgTable(
  "plan_payment_form",
  {
    id: smallint("id").primaryKey().default(1),
    fields: jsonb("fields").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [check("plan_payment_form_single_row", sql`${t.id} = 1`)],
).enableRLS();
