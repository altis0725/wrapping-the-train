import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getStorageClient, getBucketName, isStorageConfigured } from "./client";
import * as fs from "fs/promises";
import { createWriteStream } from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

// キャッシュディレクトリ
const CACHE_DIR = "/tmp/templates";

// 最大キャッシュサイズ: 5GB
const MAX_CACHE_SIZE = 5 * 1024 * 1024 * 1024;

interface CacheEntry {
  storageKey: string;
  localPath: string;
  size: number;
  lastAccess: number;
}

// インメモリでキャッシュエントリを管理
const cacheEntries: Map<string, CacheEntry> = new Map();
let currentCacheSize = 0;

// storageKey のバリデーション正規表現（パストラバーサル対策）
// 許可: templates/{category}/{id}/{timestamp}.{ext}
const STORAGE_KEY_PATTERN = /^templates\/\d+\/\d+\/\d+\.(mp4|mov)$/;

/**
 * storageKey が安全かどうかを検証（パストラバーサル対策）
 */
function validateStorageKey(storageKey: string): void {
  // パストラバーサル攻撃のパターンをチェック
  if (storageKey.includes("..") || storageKey.includes("//")) {
    throw new Error("不正なストレージキーです");
  }

  // 期待されるパターンに一致するか確認
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("不正なストレージキー形式です");
  }

  // 正規化後のパスがCACHE_DIR内に収まるか確認
  const normalizedPath = path.normalize(path.join(CACHE_DIR, storageKey));
  if (!normalizedPath.startsWith(CACHE_DIR + path.sep)) {
    throw new Error("不正なストレージキーパスです");
  }
}

/**
 * キャッシュディレクトリを初期化
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // ディレクトリが既に存在する場合は無視
  }
}

/**
 * ストレージキーからローカルキャッシュパスを取得
 * キャッシュがない場合はダウンロードしてキャッシュ
 */
export async function getOrFetchTemplate(storageKey: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("ストレージが設定されていません");
  }

  // パストラバーサル対策
  validateStorageKey(storageKey);

  await ensureCacheDir();

  // キャッシュにあればそれを返す
  const cached = cacheEntries.get(storageKey);
  if (cached) {
    // ファイルが存在するか確認
    try {
      await fs.access(cached.localPath);
      // アクセス時間を更新
      cached.lastAccess = Date.now();
      return cached.localPath;
    } catch {
      // ファイルが削除されている場合はキャッシュから削除
      cacheEntries.delete(storageKey);
      currentCacheSize -= cached.size;
    }
  }

  // ストレージからダウンロード
  const localPath = await downloadFromStorage(storageKey);
  return localPath;
}

/**
 * ストレージからファイルをダウンロードしてキャッシュ
 * ストリーミングでダウンロードしてメモリ効率を向上
 */
async function downloadFromStorage(storageKey: string): Promise<string> {
  const client = getStorageClient();
  const bucketName = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error(`ファイルが見つかりません: ${storageKey}`);
  }

  // ファイルサイズを取得（Content-Length）
  const contentLength = response.ContentLength ?? 0;

  // ファイルサイズがキャッシュ上限を超える場合はエラー
  if (contentLength > MAX_CACHE_SIZE) {
    throw new Error(`ファイルサイズが大きすぎます: ${contentLength} bytes`);
  }

  // キャッシュサイズをチェックし、必要に応じて古いエントリを削除
  await ensureCacheSpace(contentLength);

  // ローカルパスを生成（storageKey のパス構造を維持）
  const localPath = path.join(CACHE_DIR, storageKey);
  const localDir = path.dirname(localPath);

  // ディレクトリを作成
  await fs.mkdir(localDir, { recursive: true });

  // ストリーミングでファイルに直接書き込み（メモリ効率向上）
  const writeStream = createWriteStream(localPath);
  const bodyStream = response.Body as Readable;
  await pipeline(bodyStream, writeStream);

  // 実際のファイルサイズを取得
  const stats = await fs.stat(localPath);
  const fileSize = stats.size;

  // キャッシュエントリを追加
  const entry: CacheEntry = {
    storageKey,
    localPath,
    size: fileSize,
    lastAccess: Date.now(),
  };
  cacheEntries.set(storageKey, entry);
  currentCacheSize += fileSize;

  return localPath;
}

/**
 * キャッシュ容量を確保（LRU）
 */
async function ensureCacheSpace(requiredSize: number): Promise<void> {
  // 必要なサイズがキャッシュに収まるまで古いエントリを削除
  while (currentCacheSize + requiredSize > MAX_CACHE_SIZE) {
    // 最も古いエントリを見つける
    let oldestEntry: CacheEntry | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of cacheEntries) {
      if (!oldestEntry || entry.lastAccess < oldestEntry.lastAccess) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (!oldestEntry || !oldestKey) {
      break; // キャッシュが空
    }

    // ファイルを削除
    try {
      await fs.unlink(oldestEntry.localPath);
    } catch {
      // ファイルが既に削除されている場合は無視
    }

    // エントリを削除
    cacheEntries.delete(oldestKey);
    currentCacheSize -= oldestEntry.size;
  }
}

/**
 * 特定のストレージキーのキャッシュを無効化
 */
export async function invalidateCache(storageKey: string): Promise<void> {
  const entry = cacheEntries.get(storageKey);
  if (entry) {
    try {
      await fs.unlink(entry.localPath);
    } catch {
      // ファイルが既に削除されている場合は無視
    }
    cacheEntries.delete(storageKey);
    currentCacheSize -= entry.size;
  }
}

/**
 * 全キャッシュをクリア
 */
export async function clearAllCache(): Promise<void> {
  for (const entry of cacheEntries.values()) {
    try {
      await fs.unlink(entry.localPath);
    } catch {
      // ファイルが既に削除されている場合は無視
    }
  }
  cacheEntries.clear();
  currentCacheSize = 0;
}

/**
 * キャッシュ統計を取得
 */
export function getCacheStats(): {
  entryCount: number;
  totalSize: number;
  maxSize: number;
} {
  return {
    entryCount: cacheEntries.size,
    totalSize: currentCacheSize,
    maxSize: MAX_CACHE_SIZE,
  };
}
