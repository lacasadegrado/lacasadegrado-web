CREATE TABLE "photo_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photo_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "photo_releases" ADD CONSTRAINT "photo_releases_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "photo_releases_photo_id_email_uq" ON "photo_releases" USING btree ("photo_id","email");