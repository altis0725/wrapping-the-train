DROP INDEX "reservations_slot_unique";--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment2_template1_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment2_template2_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment2_template3_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment3_template1_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment3_template2_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "segment3_template3_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment2_template1_id_templates_id_fk" FOREIGN KEY ("segment2_template1_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment2_template2_id_templates_id_fk" FOREIGN KEY ("segment2_template2_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment2_template3_id_templates_id_fk" FOREIGN KEY ("segment2_template3_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment3_template1_id_templates_id_fk" FOREIGN KEY ("segment3_template1_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment3_template2_id_templates_id_fk" FOREIGN KEY ("segment3_template2_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_segment3_template3_id_templates_id_fk" FOREIGN KEY ("segment3_template3_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;