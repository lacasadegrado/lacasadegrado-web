CREATE TYPE "public"."otp_attempt_kind" AS ENUM('request', 'verify_failed');--> statement-breakpoint
CREATE TABLE "otp_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "otp_attempt_kind" NOT NULL,
	"email" "citext" NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "otp_attempts_email_created_at_idx" ON "otp_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "otp_attempts_ip_created_at_idx" ON "otp_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "otp_attempts_created_at_idx" ON "otp_attempts" USING btree ("created_at");