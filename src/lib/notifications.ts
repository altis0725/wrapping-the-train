/**
 * 通知機能
 *
 * 管理者向けにSlack/メール/コンソール通知を送信
 *
 * 環境変数:
 * - SLACK_WEBHOOK_URL: Slack通知用Webhook URL
 * - NOTIFICATION_EMAIL: メール通知先（未実装）
 */

export type NotificationType = "error" | "warning" | "info";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Slack通知を送信
 */
async function sendSlackNotification(payload: NotificationPayload): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  const emoji = {
    error: ":x:",
    warning: ":warning:",
    info: ":information_source:",
  };

  const color = {
    error: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
  };

  const slackPayload = {
    attachments: [
      {
        color: color[payload.type],
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${emoji[payload.type]} ${payload.title}`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: payload.message,
            },
          },
          ...(payload.metadata
            ? [
                {
                  type: "context",
                  elements: [
                    {
                      type: "mrkdwn",
                      text: `\`\`\`${JSON.stringify(payload.metadata, null, 2)}\`\`\``,
                    },
                  ],
                },
              ]
            : []),
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `_${new Date().toISOString()}_`,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      console.error("[Notification] Slack webhook failed:", response.status);
    }
  } catch (error) {
    console.error("[Notification] Slack webhook error:", error);
  }
}

/**
 * 通知を送信（Slack + コンソール）
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // コンソールログ（常に出力）
  const logLevel = payload.type === "error" ? "error" : payload.type === "warning" ? "warn" : "info";
  console[logLevel](`[Notification] ${payload.title}: ${payload.message}`, payload.metadata);

  // Slack通知（環境変数が設定されている場合のみ）
  await sendSlackNotification(payload);
}

/**
 * 動画生成失敗通知
 */
export async function notifyVideoGenerationFailed(
  videoId: number,
  retryCount: number,
  error: string
): Promise<void> {
  if (retryCount >= 3) {
    await sendNotification({
      type: "error",
      title: "動画生成エラー（最大リトライ超過）",
      message: `動画ID: ${videoId} が3回の生成試行後も失敗しました。手動対応が必要です。`,
      metadata: { videoId, retryCount, error },
    });
  }
}

/**
 * 決済エラー通知
 */
export async function notifyPaymentError(
  paymentIntentId: string,
  error: string
): Promise<void> {
  await sendNotification({
    type: "error",
    title: "決済エラー",
    message: `PaymentIntent: ${paymentIntentId} で決済エラーが発生しました。`,
    metadata: { paymentIntentId, error },
  });
}

/**
 * 異常検知通知
 */
export async function notifyAnomaly(
  anomalyType: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await sendNotification({
    type: "warning",
    title: `異常検知: ${anomalyType}`,
    message: description,
    metadata,
  });
}
