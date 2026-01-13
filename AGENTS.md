# AGENTS.md - 開発フロー概要

水間鉄道プロジェクションマッピング予約システムの開発ワークフロー定義。

## 運用モード: Solo

Claude Code が計画から実装、レビューまで一貫して担当。

## 開発フロー

```
Plan → Work → Review → (必要に応じてループ)
```

| フェーズ | コマンド | 内容 |
|---------|---------|------|
| 計画 | `/plan-with-agent` | 仕様確認 → タスク分解 → Plans.md 更新 |
| 実装 | `/work` | cc:TODO タスクを順次実装 |
| レビュー | `/harness-review` | セキュリティ・品質チェック |
| 検証 | `/verify` | ビルド・テスト実行 |

## タスク管理 (Plans.md)

### マーカー

| マーカー | 状態 | 説明 |
|---------|------|------|
| `cc:TODO` | 未着手 | 実行予定 |
| `cc:WIP` | 作業中 | 実装中 |
| `cc:DONE` | 完了 | 実装・検証済み |
| `cc:blocked` | ブロック | 依存タスク待ち |

## SSOT (Single Source of Truth)

| ファイル | 用途 |
|---------|------|
| `.claude/memory/decisions.md` | 設計判断の記録 |
| `.claude/memory/patterns.md` | 再利用パターン |
| `Plans.md` | 現在のタスク状況 |

## 参照ドキュメント

- [CLAUDE.md](./CLAUDE.md) - 技術スタック・ディレクトリ構成
- [.docs/spec/](./docs/spec/) - 詳細仕様書
