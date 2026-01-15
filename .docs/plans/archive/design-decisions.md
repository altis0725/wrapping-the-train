# 設計判断ログ

## Sprint 再構成 (2026-01-13)

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

## 判断履歴

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
