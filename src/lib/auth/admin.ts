import { ENV } from "./constants";

/**
 * 管理者OpenIDの一覧を取得（SSOT）
 * 環境変数 ADMIN_OPEN_IDS から取得
 * @returns 管理者OpenIDの配列
 */
export function getAdminOpenIds(): string[] {
  return ENV.adminOpenIds;
}

/**
 * 指定されたopenIdが管理者かどうかを判定
 * @param openId - 検証するユーザーのopenId
 * @returns 管理者の場合true
 */
export function isAdminOpenId(openId: string): boolean {
  if (!openId) return false;
  return getAdminOpenIds().includes(openId);
}
