ALTER TABLE "profiles" ADD COLUMN "role_label" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "free_view" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "free_download" boolean DEFAULT false NOT NULL;