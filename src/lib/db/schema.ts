import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * 命名规范（见 technical.md §4）：
 * - 表名复数 snake_case；主键 id 为 ULID（26 字符）
 * - 时间戳 UTC 毫秒 INTEGER
 */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    mustReset: integer("must_reset").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_users_username").on(t.username),
    check("users_role_check", sql`${t.role} IN ('admin','user')`),
  ],
);

export const clipboards = sqliteTable(
  "clipboards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull().default(""),
    pinnedAt: integer("pinned_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_clipboards_user_pinned_updated").on(
      t.userId,
      sql`${t.pinnedAt} DESC`,
      sql`${t.updatedAt} DESC`,
    ),
    index("idx_clipboards_user_updated").on(t.userId, sql`${t.updatedAt} DESC`),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    clipboardId: text("clipboard_id")
      .notNull()
      .references(() => clipboards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_attachments_clipboard").on(t.clipboardId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    remember: integer("remember").notNull().default(0),
    userAgent: text("user_agent"),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (t) => [
    index("idx_sessions_user").on(t.userId),
    index("idx_sessions_expires").on(t.expiresAt),
  ],
);

export const systemConfig = sqliteTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    identifier: text("identifier").notNull(),
    attemptedAt: integer("attempted_at").notNull(),
    success: integer("success").notNull(),
  },
  (t) => [
    index("idx_login_attempts_id_time").on(t.identifier, sql`${t.attemptedAt} DESC`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Clipboard = typeof clipboards.$inferSelect;
export type NewClipboard = typeof clipboards.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
