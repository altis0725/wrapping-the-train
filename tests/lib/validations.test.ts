import { describe, it, expect } from "vitest";
import { createVideoSchema, videoIdSchema } from "@/lib/validations/video";

describe("video validations", () => {
  describe("createVideoSchema", () => {
    it("should accept valid template IDs", () => {
      const result = createVideoSchema.safeParse({
        template1Id: 1,
        template2Id: 2,
        template3Id: 3,
      });

      expect(result.success).toBe(true);
    });

    it("should reject negative template IDs", () => {
      const result = createVideoSchema.safeParse({
        template1Id: -1,
        template2Id: 2,
        template3Id: 3,
      });

      expect(result.success).toBe(false);
    });

    it("should reject zero template IDs", () => {
      const result = createVideoSchema.safeParse({
        template1Id: 0,
        template2Id: 2,
        template3Id: 3,
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer template IDs", () => {
      const result = createVideoSchema.safeParse({
        template1Id: 1.5,
        template2Id: 2,
        template3Id: 3,
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing template IDs", () => {
      const result = createVideoSchema.safeParse({
        template1Id: 1,
        template2Id: 2,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("videoIdSchema", () => {
    it("should accept valid video ID", () => {
      const result = videoIdSchema.safeParse({ videoId: 123 });
      expect(result.success).toBe(true);
    });

    it("should reject negative video ID", () => {
      const result = videoIdSchema.safeParse({ videoId: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject zero video ID", () => {
      const result = videoIdSchema.safeParse({ videoId: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer video ID", () => {
      const result = videoIdSchema.safeParse({ videoId: 1.5 });
      expect(result.success).toBe(false);
    });
  });
});
