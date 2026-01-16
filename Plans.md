# Plans.md - WRAPPING THE TRAIN

水間鉄道プロジェクションマッピング予約システム

## 現在の状態

**フェーズ**: Phase 1 MVP 完了 🎉
**状態**: 動画合成改善タスク実施中

---

## Sprint 一覧

| Sprint | 内容 | 状態 | 詳細 |
|--------|------|------|------|
| 1-7 | 基盤〜品質運用 | ✅ 完了 | [.docs/plans/](.docs/plans/) 参照 |

## 追加タスク

| タスク | 内容 | 状態 | 詳細 |
|--------|------|------|------|
| E2E強化 | LINE認証対応E2Eテスト | ✅ 完了 | [archive参照](.docs/plans/archive/) |
| 動画永続化 | 生成動画のStorage保存 | ✅ 完了 | [archive参照](.docs/plans/archive/video-persistence.md) |
| 動画合成改善 | マスク移行+解像度+レイヤー修正 | 🔴 未着手 | 下記参照 |
| **UI改善** | レイアウト/サムネイル/EXP表示修正 | ✅ 完了 | 下記参照 |
| **テンプレート複製** | 同じ動画を複数カテゴリで使いまわし | ✅ 完了 | 下記参照 |

---

## 🔴 動画合成改善タスク `cc:TODO`

### 問題点

1. **マスク画像のGitHub参照** → Railway Storage へ移行
2. **出力解像度** → 有料版を 1080p (1920x1080) に
3. **動画の長さ** → 30秒 → 10秒に修正
4. **レイヤー順序** → 車輪と背景が逆転している
5. **サムネイル非表示** → Storage署名付きURL未対応
6. **背景にマスク未適用** → `mask_body_inverted.png` を背景トラックに適用

### 実装タスク

#### Phase 1: マスク画像の Railway Storage 移行 🟢

- [ ] マスク画像を Railway Storage にアップロード (`masks/mask_*.png`)
- [ ] `src/lib/storage/resolver.ts` に `getMaskUrl()` 追加
- [ ] `src/lib/shotstack.ts` の `getMaskUrl()` を Storage 参照に変更

#### Phase 2: 動画長さの修正 🔴

- [ ] `src/lib/shotstack.ts` の `VIDEO_DURATION` を `30` → `10` に変更

#### Phase 3: 有料版の解像度アップグレード 🟡

- [ ] `mergeVideos()` に `isPaid` パラメータ追加
- [ ] 出力設定を分岐: 無料=`sd`、有料=`1080`
- [ ] 呼び出し元で `video_type` に応じて `isPaid` を渡す

#### Phase 4: レイヤー順序/マスク問題の修正 🔴

- [ ] マスク画像の白黒を確認（Shotstack: 白部分に動画表示）
- [ ] マスク画像を修正（白黒反転）または tracks 順序を調整
- [ ] テスト: 車輪動画→車輪部分、背景動画→背景に正しく表示

#### Phase 4.5: 背景トラックへのマスク適用 ✅ `cc:完了`

- [x] `src/lib/shotstack.ts` の `getMaskUrl()` に `body` タイプを追加
- [x] `mergeVideos()` の背景トラックにルママスク適用
  - 変更前: `backgroundClips` は動画のみ
  - 変更後: `luma` アセット（mask_body_inverted.png）+ 動画
- [ ] テスト: 背景動画が `mask_body_inverted.png` でマスクされることを確認（動作テスト待ち）

#### Phase 5: サムネイル表示の修正 🟡

- [ ] `src/actions/template.ts` の `getAllTemplates()` を修正
  - `thumbnailUrl` が Storage キーの場合は署名付きURLに変換
- [ ] テスト: プレビュー画面でサムネイルが表示される

### 優先度

| Phase | 重要度 | 理由 |
|-------|--------|------|
| Phase 4 | 🔴 高 | 動画が正しく表示されないのは致命的 |
| Phase 4.5 | 🔴 高 | 背景にマスクがないと合成が不完全 |
| Phase 2 | 🔴 高 | テンプレートと出力の長さ不一致 |
| Phase 5 | 🟡 中 | UX に影響、ただし動作自体は可能 |
| Phase 3 | 🟡 中 | 有料版の品質向上 |
| Phase 1 | 🟢 低 | 現状でも動作する |

### 技術詳細

#### Shotstack 解像度オプション
- `sd` = 1024x576
- `hd` = 1280x720
- `1080` = 1920x1080

#### 関連ファイル
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/shotstack.ts` | VIDEO_DURATION, resolution, getMaskUrl |
| `src/lib/storage/resolver.ts` | getMaskUrl() 追加 |
| `src/actions/template.ts` | サムネイルURL解決 |
| `src/actions/video.ts` | mergeVideos 呼び出し時の isPaid |

---

## ✅ UI改善タスク `cc:完了`

### 問題点

| # | 問題 | 原因 | 影響度 |
|---|------|------|--------|
| 1 | /create の枠が左揃え | `container max-w-6xl` に `mx-auto` がない | UX |
| 2 | /reservations の枠が左揃え | 同上 | UX |
| 3 | マイページのサムネイルが表示されない | テンプレートの thumbnailUrl（storageKey形式）が presigned URL に変換されていない | UX |
| 4 | テンプレートプレビューが表示されない | 同上（ただし create ページは `getAllTemplatesWithThumbnails()` を使用しているので確認必要） | UX |
| 5 | マイページの「EXP」がわかりづらい | 英語略語が日本語ユーザーに不親切 | UX |

### 実装タスク

#### Task 1: レイアウト中央揃え修正 ✅

- [x] `src/app/(public)/create/page.tsx` の container に `mx-auto` 追加
- [x] `src/app/(public)/reservations/page.tsx` の container に `mx-auto` 追加

#### Task 2: マイページサムネイル表示修正 ✅

- [x] `src/actions/video.ts` の `getUserVideosWithTemplates()` を修正
  - テンプレートの `thumbnailUrl` が storageKey 形式の場合、presigned URL に変換
  - `resolveTemplateThumbnail()` 関数を追加
  - SSRF対策（内部IP/IPv6/DNSリバインディング遮断）
  - キャッシュによる重複API呼び出し防止

#### Task 3: テンプレートプレビュー確認 ✅

- [x] `/create` ページでのテンプレートプレビュー表示を確認
  - `getAllTemplatesWithThumbnails()` が正しく presigned URL を返していることを確認

#### Task 4: EXP表示の日本語化 ✅

- [x] `src/components/mypage/video-list.tsx` の `EXP:` を `期限:` に変更

### 関連ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/app/(public)/create/page.tsx` | `mx-auto` 追加 |
| `src/app/(public)/reservations/page.tsx` | `mx-auto` 追加 |
| `src/actions/video.ts` | サムネイルURL解決追加 |
| `src/components/mypage/video-list.tsx` | EXP → 期限 |

---

## ✅ テンプレート複製機能 `cc:完了`

### 概要

管理画面で、既存テンプレートの動画を他のカテゴリ（背景/窓/車輪）で使いまわせるようにする機能。

### ユースケース

- 同じ動画素材を「背景」と「窓」の両方で使いたい
- 一度アップロードした動画を複数カテゴリで活用したい

### 仕様

- 各テンプレートのドロップダウンメニューに「複製」オプションを追加
- 複製先のカテゴリを選択するダイアログを表示
- 動画ファイル（storageKey/videoUrl）とサムネイルは共有（コピーではなく参照）
- タイトルは「元タイトル (カテゴリ名)」形式で自動生成
- 同じカテゴリへの複製は不可

### 実装タスク

- [x] `src/actions/admin.ts` に `duplicateTemplate()` 関数を追加
  - 複製元テンプレートの取得
  - カテゴリバリデーション（1-3、同一カテゴリ禁止）
  - 新規テンプレート作成（動画/サムネイル共有）
  - 監査ログ記録
- [x] `src/components/admin/template-manager.tsx` に複製UI追加
  - ドロップダウンに「複製」メニュー追加
  - カテゴリ選択ダイアログ作成
  - 複製処理の実行とフィードバック
- [x] ビルド検証

### 関連ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/actions/admin.ts` | `duplicateTemplate()` 追加 |
| `src/components/admin/template-manager.tsx` | 複製UI追加 |

---

## 参照

- **仕様書**: [.docs/spec/README.md](.docs/spec/README.md)
- **開発ガイドライン**: [CLAUDE.md](CLAUDE.md)
- **設計判断ログ**: [.docs/plans/archive/design-decisions.md](.docs/plans/archive/design-decisions.md)
