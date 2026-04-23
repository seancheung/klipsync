import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

/**
 * argon2id 参数 —— technical.md §7 + ADR-008（OWASP 2024 推荐）。
 * memoryCost 单位为 KiB；当前值约 19MiB。
 * algorithm=2 对应 Argon2id（@node-rs/argon2 的 Algorithm 是 const enum，
 * isolatedModules 下不能直接引用，使用数字字面量等价）。
 */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2Hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2Verify(storedHash, plain);
  } catch {
    return false;
  }
}
