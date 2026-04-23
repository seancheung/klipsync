import { ulid } from "ulid";

/**
 * 生成新 ID：Crockford Base32 ULID，26 字符，前缀包含毫秒时间戳。
 * 详见 technical.md ADR-009。
 */
export function newId(): string {
  return ulid();
}
