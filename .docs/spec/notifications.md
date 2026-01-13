# 通知仕様

## 概要

ユーザーと管理者への通知チャネルと内容を定義。

---

## 1. 通知チャネル

| チャネル | 対象 | 用途 |
|---------|------|------|
| メール | ユーザー | トランザクション通知 |
| アプリ内通知 | ユーザー | リアルタイム更新 |
| Slack | 管理者 | アラート・運用通知 |

---

## 2. メール通知

### 送信サービス

**Resend** を使用（Railway環境対応）

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'WRAPPING THE TRAIN <noreply@wrapping-the-train.com>',
  to: user.email,
  subject: '予約が確定しました',
  react: <ReservationConfirmedEmail {...data} />,
});
```

### メールテンプレート一覧

| ID | 件名 | トリガー |
|----|------|---------|
| `welcome` | ようこそ！ | 新規登録時 |
| `video-created` | 動画が作成されました | 動画生成完了 |
| `video-render-failure` | 動画生成に失敗しました | 3回失敗後 |
| `reservation-confirmed` | 予約が確定しました | 決済完了 |
| `reservation-reminder` | 明日は投影日です | 投影前日 |
| `reservation-cancelled` | 予約がキャンセルされました | キャンセル完了 |
| `reservation-expired-refunded` | 予約期限切れ（返金済み） | 期限切れ後決済 |
| `render-failed-refunded` | 返金のお知らせ | 24時間後自動返金 |
| `projection-completed` | ご視聴ありがとうございました | 投影完了 |

### テンプレート詳細

#### reservation-confirmed

```tsx
// emails/reservation-confirmed.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface Props {
  userName: string;
  projectionDate: string;
  slotTime: string;
  videoThumbnail: string;
}

export function ReservationConfirmedEmail({ userName, projectionDate, slotTime, videoThumbnail }: Props) {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container>
          <Text style={headingStyle}>予約が確定しました</Text>

          <Text>{userName} 様</Text>

          <Text>
            プロジェクションマッピングの投影予約が確定しました。
          </Text>

          <Text style={detailStyle}>
            <strong>投影日:</strong> {projectionDate}<br />
            <strong>時間:</strong> {slotTime}
          </Text>

          <img src={videoThumbnail} alt="動画サムネイル" style={imageStyle} />

          <Button href="https://wrapping-the-train.com/mypage" style={buttonStyle}>
            マイページで確認
          </Button>

          <Text style={noteStyle}>
            ※ キャンセルは投影日の48時間前まで可能です
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

#### reservation-expired-refunded

```tsx
export function ReservationExpiredRefundedEmail({ userName, refundAmount }: Props) {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container>
          <Text style={headingStyle}>予約期限切れのお知らせ</Text>

          <Text>{userName} 様</Text>

          <Text>
            仮押さえの有効期限が切れたため、お支払いは自動的に返金されました。
          </Text>

          <Text style={detailStyle}>
            <strong>返金額:</strong> ¥{refundAmount.toLocaleString()}
          </Text>

          <Text>
            返金は3〜5営業日以内にお支払い方法に反映されます。
          </Text>

          <Button href="https://wrapping-the-train.com/reservations" style={buttonStyle}>
            再度予約する
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### 送信タイミング

| メール | タイミング |
|--------|-----------|
| video-created | 動画status = completed |
| reservation-confirmed | payments.status = succeeded |
| reservation-reminder | 投影日前日 9:00 JST |
| projection-completed | reservation.status = completed |

---

## 3. アプリ内通知

### Supabase Realtime

動画ステータス変更時にリアルタイム通知。

```typescript
// hooks/useVideoStatus.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useVideoStatus(videoId: number) {
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    const channel = supabase
      .channel(`video-${videoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos',
        filter: `id=eq.${videoId}`,
      }, (payload) => {
        setStatus(payload.new.status);

        // トースト通知
        if (payload.new.status === 'completed') {
          toast.success('動画の生成が完了しました！');
        } else if (payload.new.status === 'failed') {
          toast.error('動画の生成に失敗しました');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  return status;
}
```

### 通知種別

| 種別 | 表示方法 | 永続化 |
|------|---------|--------|
| 動画生成完了 | トースト | なし |
| 動画生成失敗 | トースト + バナー | あり |
| 予約リマインダー | バナー | あり |
| 仮押さえ期限警告 | カウントダウン | なし |

---

## 4. 管理者通知

### Slack通知

```typescript
// lib/notifications/slack.ts
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function notifyAdminSlack(message: AdminNotification) {
  const color = {
    info: '#36a64f',
    warning: '#ff9800',
    error: '#f44336',
  }[message.level];

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: message.title,
        text: message.body,
        fields: message.fields?.map(f => ({
          title: f.label,
          value: f.value,
          short: true,
        })),
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}
```

### 通知一覧

| イベント | レベル | チャンネル |
|---------|--------|-----------|
| レンダリング失敗（3回目） | error | #alerts |
| 24時間後自動返金 | error | #alerts |
| 新規予約 | info | #reservations |
| 投影完了 | info | #reservations |
| システムエラー | error | #alerts |

---

## 5. i18n対応方針

### 現時点

日本語のみ対応。

### 将来対応（Phase 2以降）

```typescript
// i18n/messages/ja.ts
export const ja = {
  email: {
    reservationConfirmed: {
      subject: '予約が確定しました',
      greeting: '{name} 様',
      body: 'プロジェクションマッピングの投影予約が確定しました。',
    },
  },
};

// i18n/messages/en.ts
export const en = {
  email: {
    reservationConfirmed: {
      subject: 'Your reservation is confirmed',
      greeting: 'Dear {name}',
      body: 'Your projection mapping reservation has been confirmed.',
    },
  },
};
```

### 言語設定

```typescript
// ユーザーの言語設定（将来実装）
interface User {
  // ...
  language: 'ja' | 'en';
}

// デフォルトは日本語
const DEFAULT_LANGUAGE = 'ja';
```

---

## 6. メール配信エラー処理

### リトライ戦略

```typescript
async function sendEmailWithRetry(email: EmailConfig, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(email);
      return;
    } catch (error) {
      logger.warn({ error, attempt, emailId: email.id }, 'Email send failed');

      if (attempt === maxRetries) {
        // 最終的に失敗した場合はログに記録
        await db.insert(failedEmails).values({
          template: email.template,
          recipient: email.to,
          error: error.message,
          retries: maxRetries,
        });

        // 重要なメールの場合は管理者に通知
        if (email.priority === 'high') {
          await notifyAdminSlack({
            level: 'error',
            title: 'メール送信失敗',
            body: `${email.to}への${email.template}メール送信が失敗しました`,
          });
        }
      }

      // 指数バックオフ
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```
