ALTER TABLE "videos" ADD COLUMN "background1_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "background2_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "background3_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "background4_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "background5_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "background6_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "window_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "wheel_template_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background1_template_id_templates_id_fk" FOREIGN KEY ("background1_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background2_template_id_templates_id_fk" FOREIGN KEY ("background2_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background3_template_id_templates_id_fk" FOREIGN KEY ("background3_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background4_template_id_templates_id_fk" FOREIGN KEY ("background4_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background5_template_id_templates_id_fk" FOREIGN KEY ("background5_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_background6_template_id_templates_id_fk" FOREIGN KEY ("background6_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_window_template_id_templates_id_fk" FOREIGN KEY ("window_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_wheel_template_id_templates_id_fk" FOREIGN KEY ("wheel_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservations_user_date_idx" ON "reservations" USING btree ("user_id","projection_date");--> statement-breakpoint
CREATE INDEX "videos_user_created_idx" ON "videos" USING btree ("user_id","created_at");