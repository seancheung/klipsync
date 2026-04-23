"use client";

import { useQueryClient } from "@tanstack/react-query";

import type {
  ClipboardDetail,
  ClipboardListItem,
  ClipboardListResponse,
} from "@/lib/api/types";

import { useSSESubscribe } from "./useSSE";

/**
 * 客户端合并 SSE 事件到 TanStack Query 缓存 —— technical.md §6 / tasks.md T-305
 *
 * - 列表 `['clipboards']` 与详情 `['clipboard', id]` 的同步逻辑集中在这里
 * - 新增 / 删除 / 置顶 / 附件计数 / text 预览都在本地合并，避免 SSE 一来就全量重取
 * - 排序规则按服务端：`pinned_at DESC NULLS LAST, updated_at DESC`
 */

const PREVIEW_MAX = 160;

function truncate(text: string): string {
  return text.length > PREVIEW_MAX ? text.slice(0, PREVIEW_MAX) : text;
}

function sortList(items: ClipboardListItem[]): ClipboardListItem[] {
  return [...items].sort((a, b) => {
    if (a.pinned_at !== null && b.pinned_at === null) return -1;
    if (a.pinned_at === null && b.pinned_at !== null) return 1;
    if (
      a.pinned_at !== null &&
      b.pinned_at !== null &&
      a.pinned_at !== b.pinned_at
    ) {
      return b.pinned_at - a.pinned_at;
    }
    return b.updated_at - a.updated_at;
  });
}

const CLIPBOARDS_KEY = ["clipboards"] as const;
const clipboardKey = (id: string) => ["clipboard", id] as const;

export function useClipboardListSync(): void {
  const qc = useQueryClient();

  useSSESubscribe("clipboard.created", (e) => {
    qc.setQueryData<ClipboardListResponse>(CLIPBOARDS_KEY, (prev) => {
      const prior = prev?.items ?? [];
      // 去重：本端刚 POST 成功就自己 invalidate 列表，随后收到自己的 SSE 又想再塞一次
      if (prior.some((it) => it.id === e.id)) return prev;
      const newItem: ClipboardListItem = {
        id: e.id,
        text: truncate(e.text),
        pinned_at: e.pinned_at,
        created_at: e.created_at,
        updated_at: e.updated_at,
        attachment_count: e.attachment_count,
      };
      return { items: sortList([newItem, ...prior]) };
    });
  });

  useSSESubscribe("clipboard.updated", (e) => {
    const { text, pinned_at, cleared, updated_at } = e.fields;

    qc.setQueryData<ClipboardListResponse>(CLIPBOARDS_KEY, (prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) => {
        if (it.id !== e.id) return it;
        return {
          ...it,
          text: cleared
            ? ""
            : text !== undefined
              ? truncate(text)
              : it.text,
          pinned_at: pinned_at !== undefined ? pinned_at : it.pinned_at,
          updated_at,
          attachment_count: cleared ? 0 : it.attachment_count,
        };
      });
      return { items: sortList(items) };
    });

    qc.setQueryData<ClipboardDetail>(clipboardKey(e.id), (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        text: cleared ? "" : text !== undefined ? text : prev.text,
        pinned_at: pinned_at !== undefined ? pinned_at : prev.pinned_at,
        updated_at,
        attachments: cleared ? [] : prev.attachments,
      };
    });
  });

  useSSESubscribe("clipboard.deleted", (e) => {
    qc.setQueryData<ClipboardListResponse>(CLIPBOARDS_KEY, (prev) => {
      if (!prev) return prev;
      return { items: prev.items.filter((it) => it.id !== e.id) };
    });
    // 详情缓存交由页面层 `useClipboardDetailSync` 处理（需要触发"已被删除"状态页）
  });

  useSSESubscribe("attachment.added", (e) => {
    qc.setQueryData<ClipboardListResponse>(CLIPBOARDS_KEY, (prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) =>
        it.id === e.clipboard_id
          ? {
              ...it,
              attachment_count: it.attachment_count + 1,
              updated_at: e.updated_at,
            }
          : it,
      );
      return { items: sortList(items) };
    });
    qc.setQueryData<ClipboardDetail>(clipboardKey(e.clipboard_id), (prev) => {
      if (!prev) return prev;
      if (prev.attachments.some((a) => a.id === e.attachment.id)) return prev;
      return {
        ...prev,
        attachments: [...prev.attachments, e.attachment],
        updated_at: e.updated_at,
      };
    });
  });

  useSSESubscribe("attachment.removed", (e) => {
    qc.setQueryData<ClipboardListResponse>(CLIPBOARDS_KEY, (prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) =>
        it.id === e.clipboard_id
          ? {
              ...it,
              attachment_count: Math.max(0, it.attachment_count - 1),
              updated_at: e.updated_at,
            }
          : it,
      );
      return { items: sortList(items) };
    });
    qc.setQueryData<ClipboardDetail>(clipboardKey(e.clipboard_id), (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== e.id),
        updated_at: e.updated_at,
      };
    });
  });
}

/**
 * 详情页专用：当前打开的剪贴板被另一端删除 → invalidate，让 refetch 触发 NOT_FOUND，
 * 进而让 `ClipboardWorkbench` 渲染"已被删除"状态页（FR-032）。
 */
export function useClipboardDetailSync(id: string): void {
  const qc = useQueryClient();
  useSSESubscribe("clipboard.deleted", (e) => {
    if (e.id !== id) return;
    void qc.invalidateQueries({ queryKey: clipboardKey(id), exact: true });
  });
}
