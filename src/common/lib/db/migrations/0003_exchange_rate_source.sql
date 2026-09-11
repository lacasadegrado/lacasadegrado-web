CREATE TYPE "public"."exchange_rate_source" AS ENUM('manual', 'dolarapi_oficial', 'dolarapi_paralelo');--> statement-breakpoint
ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_created_by_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "source" "exchange_rate_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;