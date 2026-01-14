# Sprint 4: 動画作成（完全版）

**状態**: ✅ 完了
**目標**: エラー処理・リトライ含む本番品質の動画生成

---

## 状態遷移設計

```
video: pending → processing → completed
                           → failed (→ retry → processing, 最大3回)
```

---

## タスク一覧

### 4.1 shadcn/ui コンポーネント追加
- [x] Dialog コンポーネント
- [x] Tabs コンポーネント
- [x] Progress コンポーネント
- [x] Skeleton コンポーネント

### 4.2 テンプレート管理
- [x] テンプレート取得API (src/actions/template.ts)
  - getTemplatesByCategory(category: 1|2|3)
  - getAllTemplates()
  - validateTemplateSelection()
- [x] テンプレートカード コンポーネント

### 4.3 動画作成UI (/create)
- [x] 3段階選択UI (背景/窓/車輪)
- [x] プレビュー表示コンポーネント
- [x] ステップナビゲーション
- [x] ローディング状態表示 (Skeleton)

### 4.4 動画生成バックエンド
- [x] 動画生成API (src/actions/video.ts)
  - createVideo: pending 状態で作成
  - getVideoStatus: ポーリング用
  - getUserVideos: ユーザーの動画一覧
  - retryVideo: 手動リトライ
- [x] Shotstack連携 (src/lib/shotstack.ts)
  - ルママスク合成 (Track1:車輪, Track2:窓, Track3:背景)
  - ジョブ投入・ステータス取得
  - pollRenderStatus: 完了までポーリング
- [x] バックグラウンド処理
  - Route Handler でジョブ開始
  - ポーリング (5秒間隔)

### 4.5 エラー処理・リトライ
- [x] 失敗時リトライ (最大3回)
  - retry_count カラム使用
- [x] 失敗通知UI
  - エラーメッセージ表示
  - 手動リトライボタン
- [x] 3回失敗時の処理
  - status: failed に固定
  - ユーザーへの通知表示

### 4.6 リアルタイム更新
- [x] 動画ステータス監視 (ポーリング)
  - useVideoStatus カスタムフック
  - 5秒間隔でステータス確認
- [x] 生成完了後のUI更新
  - completed → プレビュー表示
  - 「投影を予約する」ボタン表示

### 4.7 認可・セキュリティ (DoD)
- [x] 動画の所有者チェック (IDOR対策)
  - getVideoStatus/retryVideo に user_id チェック
- [x] 入力バリデーション (Zod)
  - template_id の存在チェック
  - カテゴリ一致チェック

---

## 完了条件 (Definition of Done)

- [x] 3段階選択で動画生成が完了する
- [x] 失敗時に最大3回リトライ可能
- [x] 他ユーザーの動画にアクセスできない
- [x] エラー時にユーザーに適切なフィードバックが表示される

---

## 作成ファイル一覧

| ファイル | 内容 |
|---------|------|
| src/components/ui/dialog.tsx | Dialog コンポーネント |
| src/components/ui/tabs.tsx | Tabs コンポーネント |
| src/components/ui/progress.tsx | Progress コンポーネント |
| src/components/ui/skeleton.tsx | Skeleton コンポーネント |
| src/actions/template.ts | テンプレート管理API |
| src/actions/video.ts | 動画生成API |
| src/lib/shotstack.ts | Shotstack連携 |
| src/lib/validations/video.ts | 動画関連バリデーション |
| src/app/api/videos/[id]/status/route.ts | 動画ステータスAPI |
| src/components/create/template-card.tsx | テンプレートカード |
| src/components/create/template-grid.tsx | テンプレートグリッド |
| src/components/create/step-indicator.tsx | ステップインジケーター |
| src/components/create/video-preview.tsx | 動画プレビュー |
| src/components/create/use-video-status.ts | ステータス監視フック |
| src/components/create/create-video-form.tsx | 動画作成フォーム |
| src/app/(public)/create/page.tsx | 動画作成ページ |

---

## 参照仕様
- [画面仕様 - CreateVideo](.docs/spec/screens.md#createvideo-create)
- [ビジネスロジック - 動画生成フロー](.docs/spec/business-logic.md#動画生成フローサーバ主導)
- [外部連携 - Shotstack](.docs/spec/integrations.md)
- [参照実装 - train-canvas shotstack.ts](~/Documents/train-canvas/server/_core/shotstack.ts)
