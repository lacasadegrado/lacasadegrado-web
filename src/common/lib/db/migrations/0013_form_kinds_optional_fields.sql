CREATE TYPE "public"."form_kind" AS ENUM('package_payment', 'general');--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "package_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "package_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "package_price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "reference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ALTER COLUMN "proof_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "kind" "form_kind" DEFAULT 'package_payment' NOT NULL;