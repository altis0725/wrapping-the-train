import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getStorageClient, getBucketName } from "./client";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import { readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";

// サムネイルサイズ
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;

// 抽出タイミング（秒）
const EXTRACT_TIME = 1;

export interface ThumbnailResult {
  success: boolean;
  storageKey?: string;
  error?: string;
}

/**
 * 動画からサムネイルを生成してストレージにアップロード
 */
export async function generateThumbnail(
  videoStorageKey: string,
  category: number,
  templateId: number
): Promise<ThumbnailResult> {
  const tempDir = join(tmpdir(), "wrapping-thumbnails");
  const timestamp = Date.now();
  const tempVideoPath = join(tempDir, `video-${timestamp}.mp4`);
  const tempThumbnailPath = join(tempDir, `thumbnail-${timestamp}.jpg`);
  const thumbnailStorageKey = `thumbnails/${category}/${templateId}/${timestamp}.jpg`;

  try {
    // 一時ディレクトリを作成
    await mkdir(tempDir, { recursive: true });

    // S3から動画をダウンロードしてストリームで直接ファイルに書き込み（メモリ節約）
    const client = getStorageClient();
    const bucketName = getBucketName();

    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: videoStorageKey,
    });

    const response = await client.send(getCommand);
    if (!response.Body) {
      return { success: false, error: "動画の取得に失敗しました" };
    }

    // ストリームを直接ファイルにパイプ（メモリに全体を載せない）
    const writeStream = createWriteStream(tempVideoPath);
    await pipeline(response.Body as Readable, writeStream);

    // FFmpegでサムネイルを生成
    await extractThumbnail(tempVideoPath, tempThumbnailPath);

    // サムネイルをS3にアップロード（サムネイルは小さいのでバッファで問題なし）
    const thumbnailBuffer = await readFile(tempThumbnailPath);

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: thumbnailStorageKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      })
    );

    return { success: true, storageKey: thumbnailStorageKey };
  } catch (error) {
    console.error("[generateThumbnail] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "サムネイル生成に失敗しました",
    };
  } finally {
    // 一時ファイルを削除
    await cleanupTempFiles(tempVideoPath, tempThumbnailPath);
  }
}

/**
 * FFmpegで動画からサムネイルを抽出
 */
function extractThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(EXTRACT_TIME)
      .frames(1)
      .size(`${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`)
      .outputOptions(["-q:v", "2"]) // JPEG品質（2が高品質、31が低品質）
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

/**
 * 一時ファイルを削除
 */
async function cleanupTempFiles(...paths: string[]): Promise<void> {
  for (const path of paths) {
    try {
      await unlink(path);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}
