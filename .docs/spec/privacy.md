# プライバシー・データ保護

## 概要

個人情報保護法およびGDPRへの対応方針を定義。

---

## 1. 収集する個人情報

| データ種別 | 内容 | 収集目的 | 保持期間 |
|-----------|------|---------|---------|
| アカウント情報 | メール、名前 | 認証・連絡 | アカウント削除まで |
| 決済情報 | Stripe顧客ID | 決済処理 | 法定保管期間（7年） |
| 動画データ | ユーザー作成動画 | サービス提供 | 無料7日/有料1年 |
| 利用ログ | IPアドレス、操作履歴 | 不正検知・改善 | 90日 |

---

## 2. 同意管理

### 利用規約・プライバシーポリシー

```typescript
// 新規登録時の同意取得
interface UserConsent {
  termsAccepted: boolean;
  termsVersion: string;
  privacyAccepted: boolean;
  privacyVersion: string;
  marketingConsent: boolean;  // オプショナル
  consentedAt: Date;
}
```

### 同意履歴の保存

```sql
CREATE TABLE user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,  -- 'terms', 'privacy', 'marketing'
  version VARCHAR(20) NOT NULL,
  consented BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. データ保持ポリシー

### 自動削除スケジュール

| データ | 保持期間 | 削除トリガー |
|--------|---------|-------------|
| 無料動画 | 7日 | cron（毎日3:00 JST） |
| 有料動画 | 投影後1年 | cron（毎日3:00 JST） |
| 期限切れ予約 | 30日 | cron（毎週） |
| 利用ログ | 90日 | cron（毎日） |
| 決済情報 | 7年 | 手動（法定期間後） |

### 削除処理

```typescript
// jobs/cleanup-personal-data.ts
async function cleanupPersonalData() {
  const cutoff = subDays(new Date(), 90);

  // 利用ログの削除
  await db.delete(accessLogs).where(lt(accessLogs.created_at, cutoff));

  // 期限切れ動画の削除
  await deleteExpiredVideos();

  // 未使用アカウントの通知（1年間ログインなし）
  await notifyInactiveUsers();
}
```

---

## 4. データ主体の権利

### 4.1 アクセス権（データエクスポート）

ユーザーが自分のデータをダウンロード可能。

```typescript
// actions/export-user-data.ts
export async function exportUserData(): Promise<ExportResult> {
  const userId = await getCurrentUserId();

  const data = {
    profile: await db.query.users.findFirst({
      where: eq(users.id, userId)
    }),
    videos: await db.query.videos.findMany({
      where: eq(videos.user_id, userId)
    }),
    reservations: await db.query.reservations.findMany({
      where: eq(reservations.user_id, userId)
    }),
    payments: await db.query.payments.findMany({
      where: eq(payments.user_id, userId)
    }),
  };

  // JSONファイルとして生成
  const exportFile = await generateExportFile(data);

  return { downloadUrl: exportFile.url, expiresAt: addHours(new Date(), 24) };
}
```

### 4.2 削除権（アカウント削除）

```typescript
// actions/delete-account.ts
export async function deleteAccount(): Promise<void> {
  const userId = await getCurrentUserId();

  // 有効な予約がある場合は拒否
  const activeReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.user_id, userId),
      inArray(reservations.status, ['hold', 'confirmed'])
    )
  });

  if (activeReservations.length > 0) {
    throw new AppError('CANNOT_DELETE', '有効な予約があるためアカウントを削除できません');
  }

  await db.transaction(async (tx) => {
    // 動画ファイル削除
    const userVideos = await tx.query.videos.findMany({
      where: eq(videos.user_id, userId)
    });
    for (const video of userVideos) {
      await deleteVideoFile(video.video_url);
    }

    // データベースレコード削除（カスケード）
    await tx.delete(users).where(eq(users.id, userId));
  });

  // Supabase Auth削除
  await supabaseAdmin.auth.admin.deleteUser(userId);

  // 削除ログ記録
  await logAccountDeletion(userId);
}
```

### 4.3 訂正権

マイページでプロフィール編集可能。

### 4.4 処理制限権

マーケティングメールのオプトアウト。

```typescript
// actions/update-preferences.ts
export async function updateMarketingConsent(consent: boolean): Promise<void> {
  const userId = await getCurrentUserId();

  await db.insert(userConsents).values({
    user_id: userId,
    consent_type: 'marketing',
    version: '1.0',
    consented: consent,
  });
}
```

---

## 5. セキュリティ対策

### 暗号化

| データ | 暗号化方式 |
|--------|-----------|
| 通信 | TLS 1.3 |
| DB保存 | Supabase標準（AES-256） |
| ファイル | Supabase Storage標準 |

### アクセス制御

```typescript
// RLSポリシーで強制（security.md参照）
// ユーザーは自分のデータのみアクセス可能
```

### 監査ログ

```typescript
interface AuditLog {
  id: number;
  user_id: number;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entity_id: number;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}
```

---

## 6. データ漏洩対応

### 検知

- 異常なアクセスパターン監視
- 大量データエクスポートの検知

### 対応フロー

```
漏洩検知
    ↓
即時対応（アクセス遮断）
    ↓
影響範囲調査
    ↓
[個人データ漏洩?]
  - Yes → 72時間以内に当局報告（GDPR要件）
        → 影響ユーザーへ通知
  - No  → 内部記録のみ
    ↓
再発防止策実施
    ↓
ポストモーテム作成
```

### 通知テンプレート

```markdown
## データ漏洩のお知らせ

{ユーザー名} 様

{日時}に発生した{インシデント概要}により、
お客様の以下の情報が影響を受けた可能性があります。

**影響を受けた可能性のある情報:**
- {情報種別1}
- {情報種別2}

**対応状況:**
{対応内容}

**お客様へのお願い:**
{推奨アクション}

ご不明点がございましたら、下記までご連絡ください。
support@wrapping-the-train.com
```

---

## 7. 第三者提供

### 提供先

| サービス | 提供データ | 目的 | 契約 |
|---------|-----------|------|------|
| Stripe | メール、決済情報 | 決済処理 | DPA締結済 |
| Supabase | 全ユーザーデータ | インフラ | DPA締結済 |
| Shotstack | 動画データ | 動画生成 | DPA締結済 |
| Resend | メールアドレス | メール配信 | DPA締結済 |

### 越境移転

- Supabase: リージョン選択可（推奨: ap-northeast-1）
- Stripe: 米国（SCCs適用）
- Shotstack: 米国（SCCs適用）

---

## 8. 法的文書

### 必要書類

- [ ] プライバシーポリシー（/privacy）
- [ ] 利用規約（/terms）
- [ ] 特定商取引法に基づく表記（/law）
- [ ] Cookie ポリシー

### 更新履歴管理

```sql
CREATE TABLE legal_documents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- 'privacy', 'terms', 'law'
  version VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
