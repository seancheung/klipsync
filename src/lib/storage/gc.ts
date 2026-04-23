import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { db } from "@/lib/db/client";
import { attachments } from "@/lib/db/schema";

import { attachmentsRoot, safeUnlink } from "./files";

/**
 * 附件孤儿清理 —— technical.md §8 / T-407
 *
 * 目录布局：`${DATA_DIR}/attachments/${userId}/${clipboardId}/${fileId}`
 * 规则：
 *  - 只比对 fileId 是否在 `attachments` 表中存在；不存在即视为孤儿。
 *  - 只删文件，不删空目录；空目录交给下次启动或忽略。
 *  - 任何 I/O 错误只记日志，不中断扫描（GC 是兜底路径）。
 */

type GcResult = {
  scanned: number;
  deleted: number;
  errors: number;
};

const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function listEntries(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    console.error("[gc] readdir failed:", dir, err);
    return [];
  }
}

async function isDir(path: string): Promise<boolean> {
  try {
    const st = await fs.stat(path);
    return st.isDirectory();
  } catch {
    return false;
  }
}

export async function runAttachmentGc(): Promise<GcResult> {
  const result: GcResult = { scanned: 0, deleted: 0, errors: 0 };
  const root = attachmentsRoot();
  if (!(await isDir(root))) return result;

  // 拉一次全量 attachment id；规模上限是用户数 × 剪贴板 × 单剪贴板附件数，
  // 本项目定位家庭 NAS，不必分页。
  const rows = db.select({ id: attachments.id }).from(attachments).all();
  const known = new Set(rows.map((r) => r.id));

  const userIds = await listEntries(root);
  for (const userId of userIds) {
    const userDir = resolve(root, userId);
    if (!(await isDir(userDir))) continue;

    const clipboardIds = await listEntries(userDir);
    for (const clipboardId of clipboardIds) {
      const clipDir = resolve(userDir, clipboardId);
      if (!(await isDir(clipDir))) continue;

      const fileIds = await listEntries(clipDir);
      for (const fileId of fileIds) {
        result.scanned += 1;
        // .tmp 是 atomicWrite 的中间态；若崩溃遗留，视为孤儿删除
        const bare = fileId.endsWith(".tmp")
          ? fileId.slice(0, -".tmp".length)
          : fileId;
        if (known.has(bare)) continue;
        const target = resolve(clipDir, fileId);
        try {
          await safeUnlink(target);
          result.deleted += 1;
        } catch (err) {
          result.errors += 1;
          console.error("[gc] unlink failed:", target, err);
        }
      }
    }
  }

  console.log(
    `[gc] attachment sweep done · scanned=${result.scanned} deleted=${result.deleted} errors=${result.errors}`,
  );
  return result;
}

type GcState = {
  timer: ReturnType<typeof setInterval> | null;
  started: boolean;
};

const GLOBAL_KEY = "__klipsyncAttachmentGc" as const;
type GlobalWithGc = typeof globalThis & { [GLOBAL_KEY]?: GcState };

/**
 * 服务端启动时调一次：立即跑一次 + 每 24h 重复。
 * HMR-safe：开发下模块会被重复 import，用 globalThis 单例防止叠起多个定时器。
 */
export function startAttachmentGc(): void {
  const g = globalThis as GlobalWithGc;
  const state = (g[GLOBAL_KEY] ??= { timer: null, started: false });
  if (state.started) return;
  state.started = true;

  void runAttachmentGc().catch((err) => {
    console.error("[gc] initial sweep failed:", err);
  });

  state.timer = setInterval(() => {
    void runAttachmentGc().catch((err) => {
      console.error("[gc] periodic sweep failed:", err);
    });
  }, GC_INTERVAL_MS);
  // 让定时器不阻塞 Node 退出（便于测试 / 容器 graceful shutdown）
  state.timer.unref?.();
}
