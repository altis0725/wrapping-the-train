# Shotstack APIパターン詳細

## 目次

1. [レンダリングリクエスト](#レンダリングリクエスト)
2. [ステータス確認](#ステータス確認)
3. [エラーハンドリング](#エラーハンドリング)

---

## レンダリングリクエスト

### 3層ルママスク合成（wrapping-the-train仕様）

```json
{
  "timeline": {
    "background": "#000000",
    "tracks": [
      {
        "clips": [
          { "asset": { "type": "luma", "src": "https://example.com/mask_wheel.png" }, "start": 0, "length": 30 },
          { "asset": { "type": "video", "src": "https://example.com/wheel.mp4" }, "start": 0, "length": 30 }
        ]
      },
      {
        "clips": [
          { "asset": { "type": "luma", "src": "https://example.com/mask_window.png" }, "start": 0, "length": 30 },
          { "asset": { "type": "video", "src": "https://example.com/window.mp4" }, "start": 0, "length": 30 }
        ]
      },
      {
        "clips": [
          { "asset": { "type": "video", "src": "https://example.com/background.mp4" }, "start": 0, "length": 30 }
        ]
      }
    ]
  },
  "output": {
    "format": "mp4",
    "resolution": "sd"
  }
}
```

### レスポンス（成功）

```json
{
  "success": true,
  "message": "Render Submitted",
  "response": {
    "id": "d2b46ed6-998a-4d6b-9d91-b8cf0193a655",
    "owner": "xxx",
    "plan": "free",
    "status": "queued"
  }
}
```

---

## ステータス確認

### レスポンス（処理中）

```json
{
  "success": true,
  "message": "OK",
  "response": {
    "id": "d2b46ed6-998a-4d6b-9d91-b8cf0193a655",
    "status": "rendering",
    "url": null,
    "error": null
  }
}
```

### レスポンス（完了）

```json
{
  "success": true,
  "message": "OK",
  "response": {
    "id": "d2b46ed6-998a-4d6b-9d91-b8cf0193a655",
    "status": "done",
    "url": "https://cdn.shotstack.io/au/stage/xxx/d2b46ed6-998a-4d6b-9d91-b8cf0193a655.mp4",
    "error": null
  }
}
```

### ステータス遷移

| ステータス | 説明 |
|-----------|------|
| `queued` | キューに追加済み |
| `fetching` | アセット取得中 |
| `preprocessing` | 前処理中 |
| `rendering` | レンダリング中 |
| `saving` | 保存中 |
| `done` | 完了（URLあり） |
| `failed` | 失敗（errorあり） |

---

## エラーハンドリング

### HTTPエラー

| コード | 対処 |
|--------|------|
| 400 | リクエストJSON構造を確認 |
| 401 | APIキーを確認 |
| 429 | レート制限、リトライ |
| 500 | Shotstack側障害、時間を置いてリトライ |

### レンダリング失敗

```json
{
  "response": {
    "status": "failed",
    "error": "Asset fetch failed: Unable to download https://..."
  }
}
```

**よくある原因**:
- アセットURLがアクセス不可
- 動画フォーマット非対応
- ファイルサイズ超過

### TypeScript実装パターン

```typescript
// タイムアウト付きfetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(`${baseUrl}/render`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify(payload),
  signal: controller.signal,
});

clearTimeout(timeoutId);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Shotstack render failed: ${response.status} ${errorText}`);
}

const data = await response.json();
const renderId = data.response?.id;
```
