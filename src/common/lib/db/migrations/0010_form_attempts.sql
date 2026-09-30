CREATE TYPE "public"."form_attempt_kind" AS ENUM('upload', 'submit');--> statement-breakpoint
CREATE TABLE "form_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "form_attempt_kind" NOT NULL,
	"form_id" uuid NOT NULL,
	"ip" text,
	"email" "citext",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "form_attempts" ADD CONSTRAINT "form_attempts_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_attempts_ip_created_at_idx" ON "form_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "form_attempts_form_email_created_at_idx" ON "form_attempts" USING btree ("form_id","email","created_at");--> statement-breakpoint
CREATE INDEX "form_attempts_created_at_idx" ON "form_attempts" USING btree ("created_at");