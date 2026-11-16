CREATE TYPE "public"."plan_payment_method" AS ENUM('pago_movil', 'bank_transfer', 'binance', 'cash');--> statement-breakpoint
CREATE TABLE "plan_payment_form" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"fields" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "plan_payment_form_single_row" CHECK ("plan_payment_form"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "plan_payment_form" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "payment_method" "plan_payment_method";--> statement-breakpoint
ALTER TABLE "plan_payment_form" ADD CONSTRAINT "plan_payment_form_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;