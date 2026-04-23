import { createHash, randomBytes } from "node:crypto";

import { eq, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Session 管理 —— technical.md §7
 *
 * 设计要点：
 * - token 明文只落 Cookie；库里只存 sha256(token)。
 * - remember=false → Session Cookie（关浏览器失效），服务端 expires_at=now+24h。
 * - remember=true  → Cookie Max-Age=30d，服务端 expires_at=now+30d。
 * - 滑动续期：last_seen_at > 1h 刷新；remember 且剩余 < 7d 续签 30d。
 */

export const SESSION_COOKIE_NAME = "klipsync_session";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const REMEMBER_COOKIE_MAX_AGE_SEC = Math.floor(THIRTY_DAYS_MS / 1000);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 只读 cookie 存取接口（next/headers 的 cookies() 返回值兼容） */
export interface ReadableCookieStore {
  get(name: string): { value: string } | undefined;
}

/** 可写 cookie 存取接口（Route Handler / Server Action 里可写） */
export interface WritableCookieStore extends ReadableCookieStore {
  set(options: {
    name: string;
    value: string;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
    path?: string;
    maxAge?: number;
  }): void;
}

export type SessionWithUser = {
  tokenHash: string;
  userId: string;
  expiresAt: number;
  remember: boolean;
  user: User;
};

export async function createSession(params: {
  userId: string;
  remember: boolean;
  userAgent?: string | null;
}): Promise<{ token: string; tokenHash: string; expiresAt: number }> {
  const token = newToken();
  const tokenHash = hashToken(token);
  const now = Date.now();
  const expiresAt = now + (params.remember ? THIRTY_DAYS_MS : ONE_DAY_MS);

  db.insert(sessions)
    .values({
      tokenHash,
      userId: params.userId,
      expiresAt,
      remember: params.remember ? 1 : 0,
      userAgent: params.userAgent ?? null,
      createdAt: now,
      lastSeenAt: now,
    })
    .run();

  return { token, tokenHash, expiresAt };
}

export async function readSession(
  cookies: ReadableCookieStore,
): Promise<SessionWithUser | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  const row = db
    .select({
      tokenHash: sessions.tokenHash,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      remember: sessions.remember,
      lastSeenAt: sessions.lastSeenAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .get();

  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt <= now) {
    db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
    return null;
  }

  // 滑动续期：last_seen_at 过期即刷新；remember 且剩余 < 7d 续签 30d
  let expiresAt = row.expiresAt;
  const updates: Partial<{ lastSeenAt: number; expiresAt: number }> = {};
  if (now - row.lastSeenAt > ONE_HOUR_MS) {
    updates.lastSeenAt = now;
  }
  if (row.remember === 1 && row.expiresAt - now < SEVEN_DAYS_MS) {
    expiresAt = now + THIRTY_DAYS_MS;
    updates.expiresAt = expiresAt;
  }
  if (Object.keys(updates).length > 0) {
    db.update(sessions).set(updates).where(eq(sessions.tokenHash, tokenHash)).run();
  }

  return {
    tokenHash: row.tokenHash,
    userId: row.userId,
    expiresAt,
    remember: row.remember === 1,
    user: row.user,
  };
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
}

export async function revokeSessionByHash(tokenHash: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

/** 启动时 + 每 24h 调一次 */
export async function cleanupExpiredSessions(): Promise<number> {
  const res = db.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
  return res.changes ?? 0;
}

const SESSION_GC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SESSION_GC_GLOBAL_KEY = "__klipsync_session_gc__";

type SessionGcState = { timer: NodeJS.Timeout | null; started: boolean };
type GlobalWithSessionGc = typeof globalThis & {
  [SESSION_GC_GLOBAL_KEY]?: SessionGcState;
};

/**
 * 启动时调一次：立即扫一次 + 每 24h 重复。
 * HMR-safe：用 globalThis 单例防止重复定时器。
 */
export function startSessionCleanup(): void {
  const g = globalThis as GlobalWithSessionGc;
  const state = (g[SESSION_GC_GLOBAL_KEY] ??= { timer: null, started: false });
  if (state.started) return;
  state.started = true;

  void cleanupExpiredSessions().catch((err) => {
    console.error("[session-gc] initial sweep failed:", err);
  });

  state.timer = setInterval(() => {
    void cleanupExpiredSessions().catch((err) => {
      console.error("[session-gc] periodic sweep failed:", err);
    });
  }, SESSION_GC_INTERVAL_MS);
  state.timer.unref?.();
}

export function writeSessionCookie(
  cookies: WritableCookieStore,
  token: string,
  remember: boolean,
): void {
  cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/",
    ...(remember ? { maxAge: REMEMBER_COOKIE_MAX_AGE_SEC } : {}),
  });
}

export function clearSessionCookie(cookies: WritableCookieStore): void {
  cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/",
    maxAge: 0,
  });
}

export function readRawSessionToken(cookies: ReadableCookieStore): string | null {
  return cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}
