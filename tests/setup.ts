import { vi } from "vitest";

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("JWT_SECRET", "test-secret-key-for-testing-purposes-only");
vi.stubEnv("LINE_CLIENT_ID", "test-line-client-id");
vi.stubEnv("LINE_CLIENT_SECRET", "test-line-client-secret");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxxxx");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_xxxxx");
vi.stubEnv("SHOTSTACK_API_KEY", "test-shotstack-key");
vi.stubEnv("CRON_SECRET", "test-cron-secret");

// Mock database
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));
