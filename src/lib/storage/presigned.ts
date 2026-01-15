import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorageClient, getBucketName, isStorageConfigured } from "./client";

// Presigned URL の有効期限（秒）: 1時間（Shotstack処理時間を考慮）
const PRESIGNED_URL_EXPIRY = 60 * 60;

/**
 * ストレージキーから Presigned URL を生成
 * Shotstack API などの外部サービスからアクセスするために使用
 */
export async function generatePresignedUrl(
  storageKey: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("ストレージが設定されていません");
  }

  const client = getStorageClient();
  const bucketName = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}
