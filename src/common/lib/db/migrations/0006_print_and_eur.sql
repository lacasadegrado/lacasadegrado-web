CREATE TYPE "public"."photo_format" AS ENUM('digital', 'print');--> statement-breakpoint
CREATE TYPE "public"."print_status" AS ENUM('pending', 'delivered');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "print_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "format" "photo_format" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "print_status" "print_status";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "print_delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "eur_to_ves" numeric(14, 4) NOT NULL;