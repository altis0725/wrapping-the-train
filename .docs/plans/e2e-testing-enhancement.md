# E2Eテスト強化計画 (v2 - LLM Debate反映)

## 背景

LINE OAuth認証を含むローカルE2Eテストの実現

## 課題と解決策

| 課題 | 解決策 |
|------|--------|
| LINE OAuth は外部リダイレクト | ~~テスト用認証バイパス API~~ → **globalSetup でDB直接書き込み** |
| 認証済みセッションの再利用 | Playwright Storage State |
| 環境分離 | ビルド時物理的除外 + ランタイムチェック（保険） |
| データ整合性 | **Seeding/Cleanup戦略** |
| LINE認証フロー検証 | **page.route() でMock化** |

---

## 設計判断ログ

| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-01-13 | `/api/auth/test-login` 不採用 | LLM Debate: 攻撃面拡張、コードに異物混入 |
| 2026-01-13 | globalSetup 方式採用 | アプリコードにテスト用ロジックを含めない |
| 2026-01-13 | ビルド時物理除外を必須化 | NODE_ENV分岐のみは「祈り」でしかない |

---

## タスク一覧

### Phase 0: テスト基盤設計 `cc:完了` [feature:security]

- [x] **0.1** テストデータSeeding戦略の設計
  - globalSetup: テストユーザー/動画/予約を作成
  - globalTeardown: `loginMethod: 'test'` データを削除
  - 識別方法: `test_` prefix または専用フラグ

- [x] **0.2** LINE認証Mock設計
  - `page.route()` でLINE認可エンドポイントをインターセプト
  - ダミー code でコールバックURLにリダイレクト
  - OAuth フロー全体をローカルで完結

### Phase 1: テスト用認証基盤 `cc:完了`

- [x] **1.1** globalSetup による認証状態作成 `[feature:security]`
  - `e2e/global-setup.ts` - DB直接操作でテストユーザー作成
  - JWT生成してStorage Stateファイルに保存
  - **アプリコード内にテスト用APIは作らない**

- [x] **1.2** テストユーザーシード作成
  - `e2e/fixtures/test-users.ts`
  - 一般ユーザー / 管理者ユーザー / 複数動画保持ユーザー
  - 各ユーザーに必要なリレーションデータも含む

- [x] **1.3** Playwright 認証セットアップ
  - Storage State ファイル生成 (`.auth/user.json`, `.auth/admin.json`)
  - `playwright.config.ts` に globalSetup/globalTeardown 追加
  - Storage State失効検知と再生成ロジック

- [x] **1.4** globalTeardown によるクリーンアップ
  - `e2e/global-teardown.ts`
  - `loginMethod: 'test'` のユーザーと関連データを削除
  - テスト間のデータ汚染を防止

### Phase 2: 認証フローテスト `cc:完了`

- [x] **2.1** 未認証アクセス制御テスト
  - `/mypage` → リダイレクト確認
  - `/admin` → リダイレクト確認
  - `/create` の途中で認証要求

- [x] **2.2** LINE認証フローテスト（Mock版）
  - `page.route()` でLINE OAuthをインターセプト
  - 認可コード取得 → コールバック → セッション発行の流れを検証
  - 外部ネットワーク依存なし

- [x] **2.3** 認証済みユーザーテスト
  - Storage State 使用でログイン状態テスト
  - マイページ表示確認
  - ログアウト動作確認

### Phase 3: ユーザーフローE2E `cc:完了`

- [x] **3.1** 動画作成フロー
  - テンプレート選択 → プレビュー → 保存
  - Shotstack API は `page.route()` でモック化
  - DB に動画レコードが作成されることを確認

- [x] **3.2** 予約フロー
  - カレンダー表示 → スロット選択 → 仮押さえ
  - Stripe Checkout は `page.route()` でモック化
  - 予約ステータス遷移を確認

- [x] **3.3** マイページ操作
  - 動画一覧表示（Seedデータを使用）
  - 予約一覧表示
  - キャンセル操作

### Phase 4: 管理者フローE2E `cc:完了`

- [x] **4.1** 管理画面アクセス
  - admin Storage State 使用
  - ダッシュボード表示

- [x] **4.2** テンプレート管理
  - 一覧 / 作成 / 編集

- [x] **4.3** 予約管理
  - 一覧表示 / ステータス変更

---

## 実装済みファイル一覧

### 基盤ファイル

| ファイル | 内容 |
|---------|------|
| `e2e/global-setup.ts` | テストデータ作成・Storage State生成 |
| `e2e/global-teardown.ts` | テストデータクリーンアップ |
| `e2e/fixtures/test-users.ts` | テストユーザー・テンプレート定義 |
| `e2e/helpers/mock-line-auth.ts` | LINE/Shotstack/Stripe Mockヘルパー |
| `playwright.config.ts` | プロジェクト設定（4プロジェクト構成） |

### テストファイル

| ファイル | プロジェクト | 内容 |
|---------|------------|------|
| `e2e/auth.unauth.spec.ts` | unauthenticated | 未認証アクセス制御 |
| `e2e/auth-flow.unauth.spec.ts` | unauthenticated | LINE認証フロー（Mock） |
| `e2e/mypage.auth.spec.ts` | authenticated | マイページ基本操作 |
| `e2e/mypage.data.spec.ts` | authenticated-with-data | データ保持ユーザーのマイページ |
| `e2e/create-video.auth.spec.ts` | authenticated | 動画作成フロー |
| `e2e/reservation.auth.spec.ts` | authenticated | 予約フロー |
| `e2e/admin.admin.spec.ts` | admin | 管理画面 |
| `e2e/home.spec.ts` | chromium | 既存テスト（互換性維持） |

### npm scripts

```bash
npm run test:e2e          # 全テスト実行
npm run test:e2e:ui       # UIモードで実行
npm run test:e2e:headed   # ブラウザ表示で実行
npm run test:e2e:debug    # デバッグモード
npm run test:e2e:auth     # 認証済みユーザーテストのみ
npm run test:e2e:admin    # 管理者テストのみ
npm run test:e2e:unauth   # 未認証テストのみ
npm run test:e2e:report   # レポート表示
```

---

## DoD (Definition of Done)

- [x] `npm run test:e2e` でローカル実行可能
- [x] 認証が必要なページのテストが動作
- [ ] CI (GitHub Actions) で実行可能
- [x] **アプリコード内にテスト専用APIが存在しない**
- [x] **テストデータのSeeding/Cleanupが自動化されている**
- [x] **LINE認証がMock化され外部依存なし**

## セキュリティ考慮事項

### 1. アプリコードへの異物混入禁止 【必須】

❌ **禁止**: `/api/auth/test-login` のようなテスト専用APIをアプリ内に作成
✅ **採用**: globalSetup でDB直接操作 + Cookie注入

**理由** (LLM Debate):
- テスト用APIは攻撃面を拡張する
- `NODE_ENV` 分岐は誤設定で崩壊する「祈り」
- 同一コードベースにバイパスを載せるのは分離の矛盾

### 2. データSeeding戦略 【必須】

| フェーズ | 処理 | 対象 |
|---------|------|------|
| globalSetup | 作成 | テストユーザー、関連データ |
| globalTeardown | 削除 | `loginMethod: 'test'` のデータ |

**識別方法**:
- `loginMethod: 'test'`
- または `openId` が `test_` prefix

### 3. 外部API Mock化 【必須】

| 外部サービス | Mock方法 |
|-------------|----------|
| LINE OAuth | `page.route()` でインターセプト |
| Shotstack | `page.route()` でインターセプト |
| Stripe | `page.route()` でインターセプト |

---

## LLM Debate フィードバック反映

| 指摘者 | 指摘内容 | 対応 |
|--------|---------|------|
| Codex | NODE_ENV分岐は「祈り」 | テスト用API自体を廃止 |
| Codex | Storage State失効検知が無い | globalSetupで毎回再生成 |
| Cursor | データSeeding戦略の欠落 | Phase 0, 1.4 で対応 |
| Cursor | LINE認証のMock化が未定義 | Phase 2.2, helpers追加 |
| 両者 | 物理的除外は必須 | アプリ内APIを作らない方式に変更 |
