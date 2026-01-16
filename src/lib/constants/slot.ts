/**
 * スロット関連の定数
 */

// スロット開始時刻 (JST)
export const SLOT_START_TIMES: Record<number, string> = {
  1: "18:15",
  2: "18:45",
  3: "19:15",
  4: "19:45",
};

// 仮押さえの有効期限（分）
export const HOLD_EXPIRY_MINUTES = 15;

// キャンセル可能な期限（投影開始の何時間前まで）
export const CANCEL_DEADLINE_HOURS = 48;

// タイムゾーン
export const TIMEZONE = "Asia/Tokyo";

// 投影料金（円）
export const PROJECTION_PRICE = 5000;

// 1スロットあたりの最大予約数
export const MAX_RESERVATIONS_PER_SLOT = 4;

/**
 * スロット番号から開始時刻を取得
 */
export function getSlotStartTime(slotNumber: number): string {
  return SLOT_START_TIMES[slotNumber] || "00:00";
}

/**
 * スロット番号から終了時刻を取得（開始から15分後）
 */
export function getSlotEndTime(slotNumber: number): string {
  const startTime = SLOT_START_TIMES[slotNumber];
  if (!startTime) return "00:00";

  const [hours, minutes] = startTime.split(":").map(Number);
  const endMinutes = minutes + 15;
  const endHours = hours + Math.floor(endMinutes / 60);
  const normalizedMinutes = endMinutes % 60;

  return `${String(endHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

/**
 * スロットの表示用時間範囲を取得
 */
export function getSlotTimeRange(slotNumber: number): string {
  const start = getSlotStartTime(slotNumber);
  const end = getSlotEndTime(slotNumber);
  return `${start}〜${end}`;
}
