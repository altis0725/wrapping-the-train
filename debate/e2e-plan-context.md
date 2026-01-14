# E2Eテスト強化計画 レビュー対象

## 背景
- 水間鉄道プロジェクションマッピング予約システム
- LINE OAuth認証を使用（外部リダイレクトが必要）
- Next.js 16 + Playwright でE2Eテスト

## 現状の課題
1. LINE OAuthは外部サーバーへのリダイレクトが必要
2. 認証済みセッションの再利用が必要
3. 本番環境とテスト環境の分離

## 提案された解決策

### テスト用認証バイパスAPI
```typescript
// /api/auth/test-login (NODE_ENV !== 'production' のみ)
POST { openId, name, role }
→ JWTセッション発行、Cookie設定
```

### Playwright Storage State
- `.auth/user.json` - 一般ユーザー
- `.auth/admin.json` - 管理者

### セキュリティ対策
1. `NODE_ENV === 'production'` で404返却
2. テストユーザーは `loginMethod: 'test'` で識別
3. `E2E_TEST_SECRET` でAPI呼び出し制限（オプション）

## フェーズ構成
- Phase 1: テスト用認証基盤（3タスク）
- Phase 2: 認証フローテスト（2タスク）
- Phase 3: ユーザーフローE2E（3タスク）
- Phase 4: 管理者フローE2E（3タスク）

## レビュー観点
1. セキュリティ: テスト用APIが本番に漏れるリスクは十分に対策されているか？
2. 実現可能性: 提案されたアプローチは技術的に妥当か？
3. 網羅性: 重要なテストケースが漏れていないか？
4. 効率性: より良い代替アプローチはあるか？
