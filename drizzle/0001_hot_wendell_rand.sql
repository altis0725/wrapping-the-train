ALTER TABLE "templates" ALTER COLUMN "video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "storage_key" varchar(512);