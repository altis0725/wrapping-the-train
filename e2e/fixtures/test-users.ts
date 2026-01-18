/**
 * E2Eテスト用ユーザー定義
 *
 * これらのユーザーはglobalSetupでDBに作成され、
 * globalTeardownで削除されます。
 */

export interface TestUserData {
  openId: string;
  name: string;
  email: string | null;
  role: "user" | "admin";
  loginMethod: "test";
}

/**
 * テストユーザー定義
 * - openIdは "test_" prefix で識別
 * - loginMethodは "test" で識別（クリーンアップ用）
 */
export const TEST_USERS = {
  /** 一般ユーザー（動画・予約なし） */
  user: {
    openId: "test_user_001",
    name: "Test User",
    email: "test-user@example.com",
    role: "user",
    loginMethod: "test",
  },

  /** 複数動画保持ユーザー */
  userWithVideos: {
    openId: "test_user_002",
    name: "Test User With Videos",
    email: "test-user-videos@example.com",
    role: "user",
    loginMethod: "test",
  },

  /** 予約保持ユーザー */
  userWithReservations: {
    openId: "test_user_003",
    name: "Test User With Reservations",
    email: "test-user-reservations@example.com",
    role: "user",
    loginMethod: "test",
  },

  /** 管理者ユーザー */
  admin: {
    openId: "test_admin_001",
    name: "Test Admin",
    email: "test-admin@example.com",
    role: "admin",
    loginMethod: "test",
  },

  /** 開発用ユーザー（free-video-creation.spec.ts用） */
  devUser: {
    openId: "dev_user_001",
    name: "Dev User",
    email: "dev@example.com",
    role: "user",
    loginMethod: "test",
  },
} as const satisfies Record<string, TestUserData>;

/**
 * テストユーザーのStorage Stateファイルパス
 */
export const STORAGE_STATE_PATHS = {
  user: ".auth/user.json",
  userWithVideos: ".auth/user-with-videos.json",
  userWithReservations: ".auth/user-with-reservations.json",
  admin: ".auth/admin.json",
  devUser: ".auth/dev-user.json",
} as const;

/**
 * テスト用テンプレートデータ
 * 
 * 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個 + 音楽1個）
 * 
 * カテゴリ:
 * - 1: 背景
 * - 2: 窓
 * - 3: 車輪
 * - 4: 音楽
 * 
 * 動画URLはShotstackからアクセス可能な公開URLを使用
 * （Google Cloud Storageのサンプル動画）
 */
export const TEST_TEMPLATES = [
  // 背景テンプレート（6個以上必要）
  {
    id: 9901,
    category: 1, // 背景
    title: "Test Background 1",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background1",
    displayOrder: 1,
    isActive: 1,
  },
  {
    id: 9902,
    category: 1, // 背景
    title: "Test Background 2",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background2",
    displayOrder: 2,
    isActive: 1,
  },
  {
    id: 9903,
    category: 1, // 背景
    title: "Test Background 3",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background3",
    displayOrder: 3,
    isActive: 1,
  },
  {
    id: 9904,
    category: 1, // 背景
    title: "Test Background 4",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background4",
    displayOrder: 4,
    isActive: 1,
  },
  {
    id: 9905,
    category: 1, // 背景
    title: "Test Background 5",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background5",
    displayOrder: 5,
    isActive: 1,
  },
  {
    id: 9906,
    category: 1, // 背景
    title: "Test Background 6",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Background6",
    displayOrder: 6,
    isActive: 1,
  },
  // 窓テンプレート
  {
    id: 9911,
    category: 2, // 窓
    title: "Test Window Template",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Window",
    displayOrder: 1,
    isActive: 1,
  },
  // 車輪テンプレート
  {
    id: 9921,
    category: 3, // 車輪
    title: "Test Wheel Template",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Wheel",
    displayOrder: 1,
    isActive: 1,
  },
  // 音楽テンプレート
  {
    id: 9931,
    category: 4, // 音楽
    title: "Test Music Template",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Music",
    displayOrder: 1,
    isActive: 1,
  },
] as const;

/**
 * テスト用動画データ（userWithVideos用）
 * 
 * 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個 + 音楽1個）
 */
export function createTestVideos(userId: number) {
  return [
    {
      userId,
      // 新仕様: 背景6個
      background1TemplateId: 9901,
      background2TemplateId: 9902,
      background3TemplateId: 9903,
      background4TemplateId: 9904,
      background5TemplateId: 9905,
      background6TemplateId: 9906,
      // 窓・車輪・音楽
      windowTemplateId: 9911,
      wheelTemplateId: 9921,
      musicTemplateId: 9931,
      videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      videoType: "free",
      status: "completed",
    },
    {
      userId,
      // 新仕様: 背景6個
      background1TemplateId: 9901,
      background2TemplateId: 9902,
      background3TemplateId: 9903,
      background4TemplateId: 9904,
      background5TemplateId: 9905,
      background6TemplateId: 9906,
      // 窓・車輪・音楽
      windowTemplateId: 9911,
      wheelTemplateId: 9921,
      musicTemplateId: 9931,
      videoUrl: null,
      videoType: "free",
      status: "pending",
    },
  ];
}

/**
 * テスト用予約データ（userWithReservations用）
 */
export function createTestReservations(userId: number, videoId: number) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return [
    {
      userId,
      videoId,
      projectionDate: tomorrowStr,
      slotNumber: 1,
      status: "confirmed",
    },
  ];
}
