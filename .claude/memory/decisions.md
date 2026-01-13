# 設計判断記録 (decisions.md)

プロジェクトの重要な設計判断を記録。

## 形式

```
### [YYYY-MM-DD] タイトル
**状況**: 何が起きたか
**判断**: 何を決めたか
**理由**: なぜその判断をしたか
**影響**: 今後何に影響するか
```

---

## 2026-01

### [2026-01-12] 技術スタック確定

**状況**: 新規プロジェクト開始にあたり技術選定が必要

**判断**: Next.js 16 + Supabase + Drizzle ORM + Stripe + Shotstack

**理由**:
- Next.js 16: App Router による最新のサーバーコンポーネント活用
- Supabase: Auth/DB/Storage を統合、無料枠で開発開始可能
- Drizzle ORM: 型安全、軽量、Supabase と相性良好
- Stripe: 日本での実績、Webhook による非同期処理
- Shotstack: ルママスク合成に対応、API ベースで扱いやすい

**影響**: 全実装がこのスタックに基づく

---

### [2026-01-12] Solo モード採用

**状況**: 開発ワークフローの選択

**判断**: Solo モード（Claude Code 単独）で開発

**理由**: 現時点で Cursor 連携不要、シンプルなワークフローを優先

**影響**: 2-Agent 運用への移行は `/harness-init --mode=2agent` で可能
