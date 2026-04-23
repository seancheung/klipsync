import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";

import { env } from "@/lib/env";

/**
 * 附件文件系统层 —— technical.md §8
 * 路径规则：`${DATA_DIR}/attachments/${userId}/${clipboardId}/${fileId}`
 */

export function attachmentsRoot(): string {
  return resolve(env.DATA_DIR, "attachments");
}

export function attachmentDir(userId: string, clipboardId: string): string {
  return resolve(attachmentsRoot(), userId, clipboardId);
}

export function attachmentPath(
  userId: string,
  clipboardId: string,
  fileId: string,
): string {
  return resolve(attachmentDir(userId, clipboardId), fileId);
}

export function userAttachmentsDir(userId: string): string {
  return resolve(attachmentsRoot(), userId);
}

/**
 * 原子写入：先写 `${target}.tmp`，落盘成功后 rename 到最终路径。
 * 崩溃或部分写时目录里只存在 .tmp，不会污染"已落库"附件集合。
 */
export async function atomicWrite(buffer: Buffer, target: string): Promise<void> {
  await fs.mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, buffer, { flag: "w" });
  await fs.rename(tmp, target);
}

/** 删文件；不存在 / 权限错误不抛——孤儿清理兜底。 */
export async function safeUnlink(target: string): Promise<void> {
  try {
    await fs.unlink(target);
  } catch {
    /* noop */
  }
}

/** 递归删除目录；目录不存在或任何错误都静默吞掉，由 GC 兜底。 */
export async function safeRmrf(target: string): Promise<void> {
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch {
    /* noop */
  }
}
