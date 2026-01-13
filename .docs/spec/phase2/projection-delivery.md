# 物理配信仕様 (Phase 2)

現地投影システムへの動画配信に関する仕様。

## 概要

現地の投影PCが、当日の投影スケジュールと動画ファイルを取得し、オフライン再生する仕組み。

## API仕様

### 投影スケジュール取得

```
GET /api/projection/playlist?date=YYYY-MM-DD
```

**認証**: 管理者トークン必須

**レスポンス**:
```json
{
  "date": "2025-01-31",
  "slots": [
    {
      "slotNumber": 1,
      "startTime": "18:15",
      "reservation": {
        "id": 123,
        "userName": "山田太郎",
        "videoId": 456,
        "videoUrl": "https://storage.supabase.co/..."
      }
    },
    {
      "slotNumber": 2,
      "startTime": "18:45",
      "reservation": null
    }
  ]
}
```

### 動画ダウンロード

```
GET /api/projection/download/[videoId]
```

**認証**: 管理者トークン必須

**レスポンス**: 動画ファイル (video/mp4)

## 現地PC仕様

### 要件

- Windows 10/11 または macOS
- 安定したネットワーク接続（投影前のダウンロード用）
- 十分なストレージ（1日分の動画を保持）

### 動作フロー

```
投影開始2時間前
    ↓
/api/projection/playlist 取得
    ↓
全動画を一括ダウンロード
    ↓
ローカルキャッシュに保存
    ↓
投影時刻になったらオフライン再生
```

### オフライン再生対応

ネットワーク切断時でも投影を継続するため:

1. **事前ダウンロード**: 投影開始前に全動画をローカルに保存
2. **キャッシュ管理**: 投影完了後に古いファイルを削除
3. **フォールバック**: ダウンロード失敗時はデフォルト動画を表示

### ディレクトリ構成

```
/projection-app/
├── cache/
│   └── 2025-01-31/
│       ├── slot1_video456.mp4
│       ├── slot2_video789.mp4
│       └── playlist.json
├── default/
│   └── fallback.mp4
└── logs/
    └── projection.log
```

## セキュリティ

### 認証方式

```typescript
// 管理者専用APIトークン
const PROJECTION_API_TOKEN = process.env.PROJECTION_API_TOKEN;

// リクエストヘッダー
headers: {
  'Authorization': `Bearer ${PROJECTION_API_TOKEN}`
}
```

### アクセス制限

- 投影配信APIは管理者のみアクセス可
- IPホワイトリスト設定（オプション）
- トークンは定期的にローテーション

## 監視・ログ

### 投影ログ

```typescript
interface ProjectionLog {
  date: string;
  slotNumber: number;
  videoId: number;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'fallback' | 'error';
  errorMessage?: string;
}
```

### アラート

- ダウンロード失敗時
- 投影開始時刻に動画準備未完了時
- ネットワーク切断検知時
