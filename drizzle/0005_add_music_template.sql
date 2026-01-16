-- videos テーブルに music_template_id カラム追加
ALTER TABLE "videos" ADD COLUMN "music_template_id" integer;

-- 外部キー制約
ALTER TABLE "videos" ADD CONSTRAINT "videos_music_template_id_templates_id_fk"
  FOREIGN KEY ("music_template_id")
  REFERENCES "public"."templates"("id")
  ON DELETE no action ON UPDATE no action;
