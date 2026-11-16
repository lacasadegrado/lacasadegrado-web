ALTER TABLE "photos" ADD COLUMN "is_package" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Package forms become sign-ups: the reference and proof are asked in "Pagos",
-- per installment. Email and package are always shown and required. Old
-- answers keep their own field snapshots, so nothing else changes.
UPDATE "forms" SET
  "fields" = (
    SELECT coalesce(
      jsonb_agg(
        CASE WHEN f->>'system' IN ('email', 'package') THEN (f - 'showIf') || '{"required": true}'::jsonb ELSE f END
        ORDER BY ord
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("forms"."fields") WITH ORDINALITY AS t(f, ord)
    WHERE coalesce(f->>'system', '') NOT IN ('reference', 'proof')
  ),
  "version" = "version" + 1,
  "updated_at" = now()
WHERE "kind" = 'package_payment';
