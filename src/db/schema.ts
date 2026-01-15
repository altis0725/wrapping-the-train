import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  date,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// users テーブル
// ============================================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }).default("line"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSignedIn: timestamp("last_signed_in").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  reservations: many(reservations),
  payments: many(payments),
}));

// ============================================================================
// templates テーブル
// ============================================================================
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  category: integer("category").notNull(), // 1:背景, 2:窓, 3:車輪
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: varchar("video_url", { length: 512 }), // 外部URL（後方互換性）
  storageKey: varchar("storage_key", { length: 512 }), // Railway Storage Bucket のキー
  thumbnailUrl: varchar("thumbnail_url", { length: 512 }),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
});

// ============================================================================
// videos テーブル
// ============================================================================
export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    template1Id: integer("template1_id").references(() => templates.id),
    template2Id: integer("template2_id").references(() => templates.id),
    template3Id: integer("template3_id").references(() => templates.id),
    videoUrl: varchar("video_url", { length: 512 }),
    videoType: varchar("video_type", { length: 20 }).notNull().default("free"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    renderId: varchar("render_id", { length: 255 }),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("videos_user_status_idx").on(table.userId, table.status),
    index("videos_expires_idx")
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
  ]
);

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  template1: one(templates, {
    fields: [videos.template1Id],
    references: [templates.id],
  }),
  template2: one(templates, {
    fields: [videos.template2Id],
    references: [templates.id],
  }),
  template3: one(templates, {
    fields: [videos.template3Id],
    references: [templates.id],
  }),
  reservations: many(reservations),
}));

// ============================================================================
// reservations テーブル
// ============================================================================
export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id),
    paymentId: integer("payment_id").references(() => payments.id),
    projectionDate: date("projection_date").notNull(),
    slotNumber: integer("slot_number").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("hold"),
    holdExpiresAt: timestamp("hold_expires_at"),
    lockedAt: timestamp("locked_at"),
    idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("reservations_date_slot_idx").on(
      table.projectionDate,
      table.slotNumber
    ),
    index("reservations_hold_expires_idx")
      .on(table.holdExpiresAt)
      .where(sql`${table.status} = 'hold'`),
    index("reservations_idempotency_key_idx").on(table.idempotencyKey),
    index("reservations_updated_at_idx").on(table.updatedAt),
    // 同一スロットの二重予約防止（有効な予約のみ対象）
    uniqueIndex("reservations_slot_unique")
      .on(table.projectionDate, table.slotNumber)
      .where(sql`${table.status} NOT IN ('expired', 'cancelled')`),
  ]
);

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [reservations.videoId],
    references: [videos.id],
  }),
  payment: one(payments, {
    fields: [reservations.paymentId],
    references: [payments.id],
  }),
}));

// ============================================================================
// payments テーブル
// ============================================================================
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  refundId: varchar("refund_id", { length: 255 }),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  reservations: many(reservations),
}));

// ============================================================================
// projection_schedules テーブル
// ============================================================================
export const projectionSchedules = pgTable("projection_schedules", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  slotsConfig: jsonb("slots_config").$type<{
    slots: number[];
    maxPerSlot?: number;
  }>(),
  isActive: boolean("is_active").notNull().default(true),
});

// ============================================================================
// stripe_events テーブル (Webhook冪等性確保用)
// ============================================================================
export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 255 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

// ============================================================================
// compensation_logs テーブル (補償処理履歴)
// ============================================================================
export const compensationLogs = pgTable(
  "compensation_logs",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 50 }).notNull(), // REFUND, SLOT_REASSIGN, MANUAL
    trigger: varchar("trigger", { length: 100 }).notNull(), // RENDER_FAILURE, EXPIRED_PAYMENT等
    reservationId: integer("reservation_id").references(() => reservations.id),
    paymentId: integer("payment_id").references(() => payments.id),
    videoId: integer("video_id").references(() => videos.id),
    amount: integer("amount"),
    resolvedBy: varchar("resolved_by", { length: 50 }).notNull(), // SYSTEM or ADMIN:{id}
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("compensation_logs_reservation_idx").on(table.reservationId),
  ]
);

// ============================================================================
// state_transition_logs テーブル (状態遷移履歴)
// ============================================================================
export const stateTransitionLogs = pgTable("state_transition_logs", {
  id: serial("id").primaryKey(),
  entity: varchar("entity", { length: 20 }).notNull(), // reservation, payment, video
  entityId: integer("entity_id").notNull(),
  fromStatus: varchar("from_status", { length: 30 }),
  toStatus: varchar("to_status", { length: 30 }).notNull(),
  trigger: varchar("trigger", { length: 50 }).notNull(), // webhook, cron, user, admin
  success: boolean("success").notNull().default(true),
  conflictDetected: boolean("conflict_detected").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// admin_audit_logs テーブル (管理者操作監査ログ)
// ============================================================================
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, CANCEL, REFUND, COMPLETE
    entity: varchar("entity", { length: 30 }).notNull(), // template, reservation, schedule, payment
    entityId: integer("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_admin_idx").on(table.adminUserId),
    index("admin_audit_logs_entity_idx").on(table.entity, table.entityId),
    index("admin_audit_logs_created_idx").on(table.createdAt),
  ]
);

// ============================================================================
// 型エクスポート
// ============================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type ProjectionSchedule = typeof projectionSchedules.$inferSelect;
export type NewProjectionSchedule = typeof projectionSchedules.$inferInsert;

export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;

export type CompensationLog = typeof compensationLogs.$inferSelect;
export type NewCompensationLog = typeof compensationLogs.$inferInsert;

export type StateTransitionLog = typeof stateTransitionLogs.$inferSelect;
export type NewStateTransitionLog = typeof stateTransitionLogs.$inferInsert;

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// ============================================================================
// Enum定義 (TypeScript型として)
// ============================================================================
export const VIDEO_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const RESERVATION_STATUS = {
  HOLD: "hold",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const TEMPLATE_CATEGORY = {
  BACKGROUND: 1, // 背景
  WINDOW: 2, // 窓
  WHEEL: 3, // 車輪
} as const;

export const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
} as const;
