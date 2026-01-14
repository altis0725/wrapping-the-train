CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity" varchar(30) NOT NULL,
	"entity_id" integer,
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compensation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"trigger" varchar(100) NOT NULL,
	"reservation_id" integer,
	"payment_id" integer,
	"video_id" integer,
	"amount" integer,
	"resolved_by" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"refund_id" varchar(255),
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projection_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"slots_config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "projection_schedules_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_id" integer NOT NULL,
	"payment_id" integer,
	"projection_date" date NOT NULL,
	"slot_number" integer NOT NULL,
	"status" varchar(30) DEFAULT 'hold' NOT NULL,
	"hold_expires_at" timestamp,
	"locked_at" timestamp,
	"idempotency_key" varchar(64),
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "state_transition_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" varchar(20) NOT NULL,
	"entity_id" integer NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30) NOT NULL,
	"trigger" varchar(50) NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"conflict_detected" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"video_url" varchar(512) NOT NULL,
	"thumbnail_url" varchar(512),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64) DEFAULT 'line',
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"template1_id" integer,
	"template2_id" integer,
	"template3_id" integer,
	"video_url" varchar(512),
	"video_type" varchar(20) DEFAULT 'free' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"render_id" varchar(255),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compensation_logs" ADD CONSTRAINT "compensation_logs_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compensation_logs" ADD CONSTRAINT "compensation_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compensation_logs" ADD CONSTRAINT "compensation_logs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_template1_id_templates_id_fk" FOREIGN KEY ("template1_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_template2_id_templates_id_fk" FOREIGN KEY ("template2_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_template3_id_templates_id_fk" FOREIGN KEY ("template3_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_idx" ON "admin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_entity_idx" ON "admin_audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "compensation_logs_reservation_idx" ON "compensation_logs" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "reservations_date_slot_idx" ON "reservations" USING btree ("projection_date","slot_number");--> statement-breakpoint
CREATE INDEX "reservations_hold_expires_idx" ON "reservations" USING btree ("hold_expires_at") WHERE "reservations"."status" = 'hold';--> statement-breakpoint
CREATE INDEX "reservations_idempotency_key_idx" ON "reservations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "reservations_updated_at_idx" ON "reservations" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_slot_unique" ON "reservations" USING btree ("projection_date","slot_number") WHERE "reservations"."status" NOT IN ('expired', 'cancelled');--> statement-breakpoint
CREATE INDEX "videos_user_status_idx" ON "videos" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "videos_expires_idx" ON "videos" USING btree ("expires_at") WHERE "videos"."expires_at" IS NOT NULL;