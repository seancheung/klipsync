import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { systemConfig } from "@/lib/db/schema";

/**
 * system_config 读写封装 —— 目前涵盖 max_attachment_mb (FR-054) 与 public_base_url (FR-055)。
 * 10s 内存缓存：读多写少场景下避免每次请求都查库；Admin 端 PATCH 时调用 invalidate。
 */

const CACHE_TTL_MS = 10_000;
const DEFAULT_MAX_ATTACHMENT_MB = 10;
const DEFAULT_PUBLIC_BASE_URL = "";

type CacheEntry<T> = { value: T; at: number };

const cache = new Map<string, CacheEntry<unknown>>();

function readKey(key: string): string | null {
  const row = db
    .select({ value: systemConfig.value })
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .get();
  return row?.value ?? null;
}

export function invalidateSystemConfig(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export function getMaxAttachmentMb(): number {
  const key = "max_attachment_mb";
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<number> | undefined;
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;

  const raw = readKey(key);
  let value = DEFAULT_MAX_ATTACHMENT_MB;
  if (raw !== null) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) value = parsed;
  }
  cache.set(key, { value, at: now });
  return value;
}

export function setMaxAttachmentMb(mb: number): void {
  const now = Date.now();
  db.insert(systemConfig)
    .values({ key: "max_attachment_mb", value: String(mb), updatedAt: now })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: String(mb), updatedAt: now },
    })
    .run();
  invalidateSystemConfig("max_attachment_mb");
}

export function getPublicBaseUrl(): string {
  const key = "public_base_url";
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<string> | undefined;
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  const raw = readKey(key);
  const value = raw ?? DEFAULT_PUBLIC_BASE_URL;
  cache.set(key, { value, at: now });
  return value;
}

export function setPublicBaseUrl(url: string): void {
  const now = Date.now();
  db.insert(systemConfig)
    .values({ key: "public_base_url", value: url, updatedAt: now })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: url, updatedAt: now },
    })
    .run();
  invalidateSystemConfig("public_base_url");
}
