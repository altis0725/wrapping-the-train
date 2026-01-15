### 1. database.md への追加

```markdown
## Templates テーブル変更履歴

### カラム追加: storage_key
動画ファイルの保存先（Railway Storage Bucket）に対応するため、`storage_key` カラムを追加しました。

| カラム名 | データ型 | Null許容 | 説明 |
| :--- | :--- | :--- | :--- |
| `storage_key` | VARCHAR(512) | はい | Railway Storage Bucket内のオブジェクトキー |

**互換性について:**
既存の `video_url` カラムは後方互換性のために維持されています。システムは `storage_key` が存在する場合はそちらを優先し、存在しない場合は `video_url` を参照します（Fallback処理）。
```

---

### 2. api.md への追加

```markdown
## テンプレート動画アップロード

### POST /api/admin/templates/upload
テンプレートとなる動画ファイルをRailway Storage Bucketへ直接アップロードするためのエンドポイントです。

- **認証:** 必須（管理者権限）
- **Content-Type:** `multipart/form-data`

#### リクエストパラメータ (FormData)
| キー | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `file` | File | はい | アップロードする動画ファイル（MP4/MOV形式、最大500MB） |
| `category` | String | いいえ | テンプレートのカテゴリ |
| `templateId` | String | いいえ | テンプレート識別子 |

#### レスポンス例
```json
{
  "success": true,
  "storageKey": "templates/2023/10/abc123def456.mp4"
}
```

#### 制約・バリデーション
- ファイルサイズ上限: **500MB**
- 許可されているMIMEタイプ: `video/mp4`, `video/quicktime`
- アップロードには管理者権限（`ADMIN_OPEN_IDS` または `OWNER_OPEN_ID`）が必要です。
```

---

### 3. integrations.md への追加

```markdown
## Railway Storage Bucket 連携

RailwayのS3互換ストレージを利用した動画ファイルの保存および配信機能を実装しています。

### 環境変数設定
本機能を利用するには、以下の環境変数を設定する必要があります。

| 変数名 | 説明 |
| :--- | :--- |
| `RAILWAY_STORAGE_ENDPOINT` | S3互換APIのエンドポイントURL |
| `RAILWAY_BUCKET_NAME` | 対象となるバケット名 |
| `RAILWAY_ACCESS_KEY_ID` | Railway発行のアクセスキーID |
| `RAILWAY_SECRET_ACCESS_KEY` | Railway発行のシークレットアクセスキー |

### モジュール構成
処理は `src/lib/storage/` ディレクトリ以下のモジュールによって構成されています。

- **client.ts**: S3クライアントの生成および設定管理
- **upload.ts**: ファイルのアップロード処理
- **presigned.ts**: オブジェクトへの直接アクセスを可能にする署名付きURLの生成（有効時間：15分）
- **resolver.ts**: テンプレートのURL解決ロジック（`storage_key` が存在する場合はそちらを優先し、なければ `video_url` へフォールバック）
- **cache.ts**: `/tmp/templates` ディレクトリを使用したLRUキャッシュ（最大容量：5GB）

### アーキテクチャ
1. アップロードはAPI経由で行われ、Railway Storage Bucketへ保存されます。
2. DBにはファイル本体ではなく `storage_key` のみが保存されます。
3. 画像・動画の取得時は `storage/resolver.ts` が適切なURL（Presigned URLまたは既存のURL）を解決します。
```

---

### 4. security.md への追加

```markdown
## 認証・認可: 複数管理者対応

管理者権限の判定ロジックを拡張し、複数の管理者IDを登録可能にしました。

### 環境変数による管理者定義

| 変数名 | 形式 | 優先度/説明 |
| :--- | :--- | :--- |
| `ADMIN_OPEN_IDS` | カンマ区切り文字列 | **推奨**: 複数の管理者OpenIDを `id1,id2,...` の形式で指定します。 |
| `OWNER_OPEN_ID` | 単一文字列 | **非推奨 (後方互換用)**: 従来の単一管理者設定。設定されている場合は `ADMIN_OPEN_IDS` と併用され、いずれにも含まれるIDが管理者として認識されます。 |

### 実装 (SSoT)
管理者判定のロジックは `src/lib/auth/admin.ts` に集約されています（Single Source of Truth）。

#### 主要関数
- **`getAdminOpenIds()`**: 環境変数から設定されたすべての管理者IDのリストを返します（`ADMIN_OPEN_IDS` と `OWNER_OPEN_ID` のマージ処理を含む）。
- **`isAdminOpenId(openId: string)`**: 指定されたOpenIDが管理者権限を持っているか判定します。

これにより、APIルートやミドルウェアにおける権限チェックを一元管理しています。
```