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
} as const satisfies Record<string, TestUserData>;

/**
 * テストユーザーのStorage Stateファイルパス
 */
export const STORAGE_STATE_PATHS = {
  user: ".auth/user.json",
  userWithVideos: ".auth/user-with-videos.json",
  userWithReservations: ".auth/user-with-reservations.json",
  admin: ".auth/admin.json",
} as const;

/**
 * テスト用テンプレートデータ
 */
export const TEST_TEMPLATES = [
  {
    id: 9901,
    category: 1, // 背景
    title: "Test Background Template",
    videoUrl: "https://example.com/test-bg.mp4",
    thumbnailUrl: "https://example.com/test-bg-thumb.jpg",
    displayOrder: 1,
    isActive: 1,
  },
  {
    id: 9902,
    category: 2, // 窓
    title: "Test Window Template",
    videoUrl: "https://example.com/test-window.mp4",
    thumbnailUrl: "https://example.com/test-window-thumb.jpg",
    displayOrder: 1,
    isActive: 1,
  },
  {
    id: 9903,
    category: 3, // 車輪
    title: "Test Wheel Template",
    videoUrl: "https://example.com/test-wheel.mp4",
    thumbnailUrl: "https://example.com/test-wheel-thumb.jpg",
    displayOrder: 1,
    isActive: 1,
  },
] as const;

/**
 * テスト用動画データ（userWithVideos用）
 */
export function createTestVideos(userId: number) {
  return [
    {
      userId,
      template1Id: 9901,
      template2Id: 9902,
      template3Id: 9903,
      videoUrl: "https://example.com/test-video-1.mp4",
      videoType: "free",
      status: "completed",
    },
    {
      userId,
      template1Id: 9901,
      template2Id: 9902,
      template3Id: 9903,
      videoUrl: "https://example.com/test-video-2.mp4",
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
