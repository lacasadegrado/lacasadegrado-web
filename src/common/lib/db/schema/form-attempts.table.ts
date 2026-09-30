import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext.type";
import { formAttemptKindEnum } from "./enums.table";
import { forms } from "./forms.table";

/**
 * Append-only log behind the public forms' rate limits: every presigned
 * upload and every accepted submission, by IP (and email on submit). Like
 * `otp_attempts`, rows older than a day are pruned opportunistically and
 * never leave the server.
 */
export const formAttempts = pgTable(
  "form_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: formAttemptKindEnum("kind").notNull(),
    /** Cascade: a log row has no value once its form is gone. */
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    ip: text("ip"),
    email: citext("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("form_attempts_ip_created_at_idx").on(t.ip, t.createdAt),
    index("form_attempts_form_email_created_at_idx").on(t.formId, t.email, t.createdAt),
    index("form_attempts_created_at_idx").on(t.createdAt),
  ],
).enableRLS();
