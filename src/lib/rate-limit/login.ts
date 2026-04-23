import { createHash } from "node:crypto";

import { and, eq, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { loginAttempts } from "@/lib/db/schema";

/**
 * 登录失败限流 —— technical.md §7
 *
 * 规则：
 *   60s 内失败 ≥ 5 次 → 锁 60s；成功登录清零该 identifier。
 *   identifier = sha256(username + ':' + ip)（不落明文）。
 *
 * 存储：
 *   内存 LRU 为主（微秒级读取），login_attempts 表兜底（进程重启不丢）。
 *
 * 清理：
 *   24h 前的行由惰性清理（每次 check 抽检）+ 启动时全扫。
 */

const WINDOW_MS = 60_000;
const FAIL_THRESHOLD = 5;
const LOCKOUT_MS = 60_000;
const ATTEMPTS_RETENTION_MS = 24 * 60 * 60 * 1000;
const LRU_CAPACITY = 1024;

type Entry = {
  failures: number[]; // 成功登录会清空；只记失败时间戳
  lockUntil: number; // 0 表示未锁
};

// Map 迭代顺序 = 插入顺序，借此实现一个极简 LRU
const memory = new Map<string, Entry>();

function touch(id: string, entry: Entry): void {
  memory.delete(id);
  memory.set(id, entry);
  if (memory.size > LRU_CAPACITY) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
}

export function computeIdentifier(username: string, ip: string): string {
  return createHash("sha256").update(`${username}:${ip}`).digest("hex");
}

export type LimitCheck =
  | { blocked: false }
  | { blocked: true; retryAfterSec: number };

export function check(identifier: string): LimitCheck {
  const now = Date.now();
  const entry = memory.get(identifier);
  if (entry && entry.lockUntil > now) {
    return {
      blocked: true,
      retryAfterSec: Math.ceil((entry.lockUntil - now) / 1000),
    };
  }
  // 内存兜底完毕，检查 DB 里的近期失败（防进程刚重启）
  if (!entry) {
    const rows = db
      .select({ attemptedAt: loginAttempts.attemptedAt })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.success, 0),
          gte(loginAttempts.attemptedAt, now - WINDOW_MS),
        ),
      )
      .all();
    if (rows.length >= FAIL_THRESHOLD) {
      const latest = rows.reduce((m, r) => Math.max(m, r.attemptedAt), 0);
      const lockUntil = latest + LOCKOUT_MS;
      if (lockUntil > now) {
        touch(identifier, {
          failures: rows.map((r) => r.attemptedAt),
          lockUntil,
        });
        return {
          blocked: true,
          retryAfterSec: Math.ceil((lockUntil - now) / 1000),
        };
      }
    }
  }
  return { blocked: false };
}

export function record(identifier: string, success: boolean): void {
  const now = Date.now();

  db.insert(loginAttempts)
    .values({
      identifier,
      attemptedAt: now,
      success: success ? 1 : 0,
    })
    .run();

  const entry = memory.get(identifier) ?? { failures: [], lockUntil: 0 };
  if (success) {
    memory.delete(identifier);
    return;
  }

  // 仅保留窗口内的失败时间戳
  entry.failures = entry.failures.filter((t) => now - t < WINDOW_MS);
  entry.failures.push(now);
  if (entry.failures.length >= FAIL_THRESHOLD) {
    entry.lockUntil = now + LOCKOUT_MS;
  }
  touch(identifier, entry);

  // 抽样触发 DB 惰性清理（1/20 的概率）
  if (Math.random() < 0.05) {
    db.delete(loginAttempts)
      .where(lt(loginAttempts.attemptedAt, now - ATTEMPTS_RETENTION_MS))
      .run();
  }
}

/** 启动时调用一次，清理远期行。 */
export function cleanupLoginAttempts(): number {
  const res = db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, Date.now() - ATTEMPTS_RETENTION_MS))
    .run();
  return res.changes ?? 0;
}

/**
 * 从 NextRequest 拿客户端 IP：
 * TRUST_PROXY=true 时解析 X-Forwarded-For 的第一段；否则回落到 Next 传来的 ip。
 */
export function clientIp(headers: Headers, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = headers.get("x-real-ip");
    if (realIp) return realIp;
  }
  return "0.0.0.0";
}
