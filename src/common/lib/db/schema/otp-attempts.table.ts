import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext.type";

export const otpAttemptKindEnum = pgEnum("otp_attempt_kind", [
  "request",
  "verify_failed",
]);

/**
 * Append-only log backing our own OTP rate limits (security rule 8), on
 * top of Supabase's built-in ones. Rows older than a day are pruned
 * opportunistically. Never exposed to the client.
 */
export const otpAttempts = pgTable(
  "otp_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: otpAttemptKindEnum("kind").notNull(),
    email: citext("email").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("otp_attempts_email_created_at_idx").on(t.email, t.createdAt),
    index("otp_attempts_ip_created_at_idx").on(t.ip, t.createdAt),
    index("otp_attempts_created_at_idx").on(t.createdAt),
  ],
).enableRLS();

export type OtpAttemptKind = (typeof otpAttemptKindEnum.enumValues)[number];
