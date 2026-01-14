import { describe, it, expect } from "vitest";
import {
  slotNumberSchema,
  holdSlotSchema,
  reservationIdSchema,
  getAvailableSlotsSchema,
} from "@/lib/validations/reservation";

describe("reservation validations", () => {
  describe("slotNumberSchema", () => {
    it("should accept valid slot numbers (1-4)", () => {
      expect(slotNumberSchema.safeParse(1).success).toBe(true);
      expect(slotNumberSchema.safeParse(2).success).toBe(true);
      expect(slotNumberSchema.safeParse(3).success).toBe(true);
      expect(slotNumberSchema.safeParse(4).success).toBe(true);
    });

    it("should reject slot number 0", () => {
      const result = slotNumberSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it("should reject slot number 5", () => {
      const result = slotNumberSchema.safeParse(5);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer slot numbers", () => {
      const result = slotNumberSchema.safeParse(1.5);
      expect(result.success).toBe(false);
    });
  });

  describe("holdSlotSchema", () => {
    it("should accept valid hold slot request", () => {
      const result = holdSlotSchema.safeParse({
        videoId: 1,
        date: "2026-01-15",
        slotNumber: 2,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = holdSlotSchema.safeParse({
        videoId: 1,
        date: "2026/01/15",
        slotNumber: 2,
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid date format (no leading zeros)", () => {
      const result = holdSlotSchema.safeParse({
        videoId: 1,
        date: "2026-1-5",
        slotNumber: 2,
      });

      expect(result.success).toBe(false);
    });

    it("should reject negative video ID", () => {
      const result = holdSlotSchema.safeParse({
        videoId: -1,
        date: "2026-01-15",
        slotNumber: 2,
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid slot number", () => {
      const result = holdSlotSchema.safeParse({
        videoId: 1,
        date: "2026-01-15",
        slotNumber: 5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("reservationIdSchema", () => {
    it("should accept valid reservation ID", () => {
      const result = reservationIdSchema.safeParse({ reservationId: 123 });
      expect(result.success).toBe(true);
    });

    it("should reject negative reservation ID", () => {
      const result = reservationIdSchema.safeParse({ reservationId: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject zero reservation ID", () => {
      const result = reservationIdSchema.safeParse({ reservationId: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("getAvailableSlotsSchema", () => {
    it("should accept valid date", () => {
      const result = getAvailableSlotsSchema.safeParse({
        date: "2026-01-15",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = getAvailableSlotsSchema.safeParse({
        date: "01-15-2026",
      });

      expect(result.success).toBe(false);
    });
  });
});
