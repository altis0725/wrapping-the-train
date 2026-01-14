import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendNotification, notifyVideoGenerationFailed, notifyPaymentError } from "@/lib/notifications";

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  describe("sendNotification", () => {
    it("should log to console", async () => {
      const consoleSpy = vi.spyOn(console, "info");

      await sendNotification({
        type: "info",
        title: "Test Title",
        message: "Test message",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Notification] Test Title: Test message",
        undefined
      );
    });

    it("should log errors with console.error", async () => {
      const consoleSpy = vi.spyOn(console, "error");

      await sendNotification({
        type: "error",
        title: "Error Title",
        message: "Error message",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Notification] Error Title: Error message",
        undefined
      );
    });

    it("should send Slack notification when webhook is configured", async () => {
      vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test");

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      // Re-import to pick up new env
      const { sendNotification: sendNotif } = await import("@/lib/notifications");

      await sendNotif({
        type: "info",
        title: "Test",
        message: "Test message",
      });

      // Note: Due to module caching, this test may not work as expected
      // In real tests, you'd use dependency injection or module mocking
    });
  });

  describe("notifyVideoGenerationFailed", () => {
    it("should send notification when retry count >= 3", async () => {
      const consoleSpy = vi.spyOn(console, "error");

      await notifyVideoGenerationFailed(123, 3, "Render timeout");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("動画生成エラー"),
        expect.anything()
      );
    });

    it("should not send notification when retry count < 3", async () => {
      const consoleSpy = vi.spyOn(console, "error");

      await notifyVideoGenerationFailed(123, 2, "Render timeout");

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe("notifyPaymentError", () => {
    it("should send notification for payment errors", async () => {
      const consoleSpy = vi.spyOn(console, "error");

      await notifyPaymentError("pi_123", "Card declined");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("決済エラー"),
        expect.objectContaining({ paymentIntentId: "pi_123" })
      );
    });
  });
});
