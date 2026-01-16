# 動画永続化タスク（完了: 2026-01-15）

## 背景・問題点

ShotstackのCDN URLは一時的（Sandbox: 24時間、Production: 数日）で期限切れになる。
現在の実装では `videoUrl` にCDN URLをそのまま保存しているため、期限後に動画にアクセスできなくなる。

## 解決策

テンプレート動画と同様にRailway Storage Bucketに永続保存する。

## 実装タスク

### Phase 1: DBスキーマ拡張

- [x] `videos` テーブルに `storageKey` カラム追加 ✅
  - `storageKey: varchar("storage_key", { length: 512 })`
  - マイグレーション実行済み

### Phase 2: 動画アップロード機能

- [x] `src/lib/storage/video-upload.ts` 新規作成 ✅
  - `downloadAndUploadVideo(sourceUrl, userId, videoId)` 関数
  - SSRF対策: Shotstack CDN のホストのみ許可
  - DoS対策: ストリーミングでサイズ制限強制
  - Storage Key: `videos/{userId}/{videoId}/{timestamp}.mp4`

### Phase 3: ステータス更新時の永続化

- [x] `src/app/api/videos/[id]/status/route.ts` 修正 ✅
  - Race condition対策: アトミッククレーム（sentinel値）で多重アップロード防止
  - レンダリング完了時（status === "done"）にStorage Bucketへ永続保存
  - 保存失敗時はCDN URLをfallbackとして維持（後方互換）

### Phase 4: 動画URL解決ロジック

- [x] `src/lib/storage/resolver.ts` に `getVideoUrl()` 追加 ✅
  - セキュリティ: 厳格なパターンバリデーション (`/^videos\/\d+\/\d+\/\d+\.mp4$/`)
  - `storageKey` があれば署名付きURL生成（1時間有効）
  - なければ `videoUrl` をfallback（後方互換）

### Phase 5: Cron削除処理の拡張

- [x] `src/app/api/cron/cleanup-videos/route.ts` 修正 ✅
  - DB削除前にStorage Bucketからファイル削除
  - セキュリティ: storageKeyパターンバリデーション
  - エラーハンドリング: Storage削除失敗時もDB削除は実行

### Phase 6: マイページ・表示部分の対応

- [x] `src/actions/video.ts` の `getUserVideosWithTemplates()` で `getVideoUrl()` 使用 ✅
  - 動画一覧取得時に署名付きURLを並列生成

## 注意事項

- 無料動画の有効期限は7日間（`FREE_VIDEO_EXPIRY_DAYS = 7`）
- 有料動画（`video_type: paid`）は無期限
- 既存の動画はCDN URLのまま（マイグレーション不要、期限切れで自然消滅）
