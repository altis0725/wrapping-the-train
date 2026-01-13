# 実装品質ルール

## 禁止事項

### 形骸化実装禁止

```typescript
// NG: TODO を残したままの実装
async function processPayment() {
  // TODO: 実装する
  return { success: true };
}

// NG: エラーハンドリングの省略
async function fetchData() {
  const res = await fetch(url);
  return res.json(); // エラー時の考慮なし
}

// NG: 型の any 乱用
function process(data: any): any {
  return data.value;
}
```

### セキュリティ違反禁止

- [ ] SQL インジェクション対策（ORM 使用、パラメータバインド）
- [ ] XSS 対策（ユーザー入力のサニタイズ）
- [ ] 認証チェックの省略禁止
- [ ] 機密情報のハードコード禁止

## 必須事項

### コード品質

- TypeScript strict モード準拠
- ESLint エラー 0
- 適切なエラーハンドリング

### レビュー前チェック

```bash
npm run build    # ビルド成功
npm run lint     # lint エラーなし
npm run test     # テスト全パス
```

## 例外申請

上記ルールを一時的に緩和する場合:

1. `decisions.md` に理由を記録
2. TODO コメントに期限を明記: `// TODO(2026-02-01): 〇〇対応後に修正`
