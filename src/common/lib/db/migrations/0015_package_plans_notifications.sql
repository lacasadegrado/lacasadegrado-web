CREATE TYPE "public"."notification_kind" AS ENUM('order_payment', 'package_payment', 'package_paid');--> statement-breakpoint
CREATE TYPE "public"."package_payment_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."package_plan_status" AS ENUM('open', 'paid');--> statement-breakpoint
ALTER TYPE "public"."form_attempt_kind" ADD VALUE 'plan_link';--> statement-breakpoint
CREATE TABLE "package_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"email" "citext",
	"person_name" text,
	"package_name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"installments" integer NOT NULL,
	"token_hash" text NOT NULL,
	"status" "package_plan_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "package_plans_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "package_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photo_packages" ADD COLUMN "installments" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "installments_covered" integer;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "amount_cents" integer;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "eur_to_ves" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "payment_status" "package_payment_status";--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "package_plans" ADD CONSTRAINT "package_plans_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_plans" ADD CONSTRAINT "package_plans_package_id_photo_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."photo_packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_plans" ADD CONSTRAINT "package_plans_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "package_plans_package_id_email_idx" ON "package_plans" USING btree ("package_id","email");--> statement-breakpoint
CREATE INDEX "package_plans_event_id_status_idx" ON "package_plans" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "notifications_profile_id_created_at_idx" ON "notifications" USING btree ("profile_id","created_at");--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_plan_id_package_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."package_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_submissions_plan_id_idx" ON "form_submissions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "form_submissions_payment_status_idx" ON "form_submissions" USING btree ("payment_status");