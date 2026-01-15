# Plans.md - WRAPPING THE TRAIN

水間鉄道プロジェクションマッピング予約システム

## 現在の状態

**フェーズ**: Phase 1 MVP 完了 🎉
**状態**: 全 Sprint 完了、デプロイ準備完了

---

## Sprint 一覧

| Sprint | 内容 | 状態 | 詳細 |
|--------|------|------|------|
| 1 | 基盤構築 | ✅ 完了 | [sprint-1-基盤構築.md](.docs/plans/sprint-1-基盤構築.md) |
| 2 | 認証 | ✅ 完了 | [sprint-2-認証.md](.docs/plans/sprint-2-認証.md) |
| 3 | 公開ページ | ✅ 完了 | [sprint-3-公開ページ.md](.docs/plans/sprint-3-公開ページ.md) |
| 4 | 動画作成（完全版） | ✅ 完了 | [sprint-4-動画作成.md](.docs/plans/sprint-4-動画作成.md) |
| 5 | 予約・決済（整合性担保） | ✅ 完了 | [sprint-5-予約決済.md](.docs/plans/sprint-5-予約決済.md) |
| 6 | マイページ + 管理画面 | ✅ 完了 | [sprint-6-マイページ.md](.docs/plans/sprint-6-マイページ.md) |
| 7 | 品質・運用・バッファ | ✅ 完了 | [sprint-7-品質運用.md](.docs/plans/sprint-7-品質運用.md) |

---

## 追加タスク

| タスク | 内容 | 状態 | 詳細 |
|--------|------|------|------|
| E2E強化 | LINE認証対応E2Eテスト (v2) | ✅ 完了 | [e2e-testing-enhancement.md](.docs/plans/e2e-testing-enhancement.md) |
| 動画永続化 | 生成動画のStorage保存 | ✅ 完了 | 下記参照 |

---

## ✅ 動画永続化タスク（完了）

### 背景・問題点

ShotstackのCDN URLは一時的（Sandbox: 24時間、Production: 数日）で期限切れになる。
現在の実装では `videoUrl` にCDN URLをそのまま保存しているため、期限後に動画にアクセスできなくなる。

### 解決策

テンプレート動画と同様にRailway Storage Bucketに永続保存する。

### 実装タスク

#### Phase 1: DBスキーマ拡張

- [x] `videos` テーブルに `storageKey` カラム追加 ✅
  - `storageKey: varchar("storage_key", { length: 512 })`
  - マイグレーション実行済み

#### Phase 2: 動画アップロード機能

- [x] `src/lib/storage/video-upload.ts` 新規作成 ✅
  - `downloadAndUploadVideo(sourceUrl, userId, videoId)` 関数
  - SSRF対策: Shotstack CDN のホストのみ許可
  - DoS対策: ストリーミングでサイズ制限強制
  - Storage Key: `videos/{userId}/{videoId}/{timestamp}.mp4`

#### Phase 3: ステータス更新時の永続化

- [x] `src/app/api/videos/[id]/status/route.ts` 修正 ✅
  - Race condition対策: アトミッククレーム（sentinel値）で多重アップロード防止
  - レンダリング完了時（status === "done"）にStorage Bucketへ永続保存
  - 保存失敗時はCDN URLをfallbackとして維持（後方互換）

#### Phase 4: 動画URL解決ロジック

- [x] `src/lib/storage/resolver.ts` に `getVideoUrl()` 追加 ✅
  - セキュリティ: 厳格なパターンバリデーション (`/^videos\/\d+\/\d+\/\d+\.mp4$/`)
  - `storageKey` があれば署名付きURL生成（1時間有効）
  - なければ `videoUrl` をfallback（後方互換）

#### Phase 5: Cron削除処理の拡張

- [x] `src/app/api/cron/cleanup-videos/route.ts` 修正 ✅
  - DB削除前にStorage Bucketからファイル削除
  - セキュリティ: storageKeyパターンバリデーション
  - エラーハンドリング: Storage削除失敗時もDB削除は実行

#### Phase 6: マイページ・表示部分の対応

- [x] `src/actions/video.ts` の `getUserVideosWithTemplates()` で `getVideoUrl()` 使用 ✅
  - 動画一覧取得時に署名付きURLを並列生成

### 注意事項

- 無料動画の有効期限は7日間（`FREE_VIDEO_EXPIRY_DAYS = 7`）
- 有料動画（`video_type: paid`）は無期限
- 既存の動画はCDN URLのまま（マイグレーション不要、期限切れで自然消滅）

---

## 再構成について (2026-01-13)

LLM Debate (Claude / Codex / Cursor) の結果、Vertical Slice アプローチに変更:

| 変更前 | 変更後 |
|--------|--------|
| Sprint 4: 動画UI のみ | Sprint 4: **完全版** (エラー処理・認可含む) |
| Sprint 5: 予約UI のみ | Sprint 5: **整合性担保** (Cron・Webhook必須) |
| Sprint 6: マイページ | Sprint 6: マイページ **+ 管理画面統合** |
| Sprint 7: 管理画面 | Sprint 7: **品質・運用・バッファ** |
| Sprint 8: 品質・運用 | **削除** (Sprint 4-7 に分散) |

**理由**:
- 依存関係の破綻を解消 (Sprint 5 の仮押さえ → Cron を同一 Sprint に)
- セキュリティを DoD に含める (後付け不可)
- 状態遷移を各 Sprint で明文化

---

## 状態遷移設計

### Video
```
draft → rendering → ready / failed (→ retry, 最大3回)
```

### Reservation
```
hold (15分TTL) → confirmed / expired / cancelled
```

### Payment
```
pending → succeeded → refunded / failed
```

---

## 設計判断ログ

| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-01-12 | ハーネス導入 | Solo モードで開発開始 |
| 2026-01-12 | Sprint 分割 | 依存関係を考慮し8スプリントに分割 |
| 2026-01-12 | Supabase削除 → LINE認証 | LINE Loginのみ使用、Supabase不要に |
| 2026-01-12 | JWT + jose | Supabase Session不要、jose で軽量実装 |
| 2026-01-13 | Plans.md 分割 | スプリントごとに .docs/plans/ に分割 |
| 2026-01-13 | Sprint 再構成 | LLM Debate 結果を反映、Vertical Slice に変更 |
| 2026-01-13 | Sprint 7 開発環境 | LLM Debate: ハイブリッド構成 (ローカル+Docker DB / Railway Preview) |
| 2026-01-14 | E2E強化実装完了 | globalSetup方式 + LINE OAuth Mock + Storage State |
| 2026-01-15 | 動画永続化追加 | Shotstack CDN URL期限切れ対策 |

---

## 参照

- **仕様書**: [.docs/spec/README.md](.docs/spec/README.md)
- **開発ガイドライン**: [CLAUDE.md](CLAUDE.md)
