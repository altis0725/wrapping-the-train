import { S3Client } from "@aws-sdk/client-s3";

/**
 * Railway Storage Bucket 用 S3 クライアント
 * Railway は S3 互換 API を提供しているため、AWS SDK で接続可能
 */
export function getStorageClient(): S3Client {
  const endpoint = process.env.RAILWAY_STORAGE_ENDPOINT;
  const accessKeyId = process.env.RAILWAY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.RAILWAY_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("ストレージ設定が不完全です。管理者に連絡してください。");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // Railway Storage Bucket では path style を使用
  });
}

/**
 * バケット名を取得
 */
export function getBucketName(): string {
  const bucketName = process.env.RAILWAY_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("RAILWAY_BUCKET_NAME が設定されていません。");
  }
  return bucketName;
}

/**
 * ストレージが設定済みかどうかを確認
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.RAILWAY_STORAGE_ENDPOINT &&
    process.env.RAILWAY_ACCESS_KEY_ID &&
    process.env.RAILWAY_SECRET_ACCESS_KEY &&
    process.env.RAILWAY_BUCKET_NAME
  );
}
