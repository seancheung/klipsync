"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, Pin, Plus } from "lucide-react";

import { apiGet } from "@/lib/api/client";
import type { ClipboardListResponse } from "@/lib/api/types";
import { formatRelative, formatTimeHM } from "@/lib/format/time";
import { useActiveClipboard } from "@/lib/store/active-clipboard";
import { useListDrawer } from "@/lib/store/list-drawer";
import { cn } from "@/lib/utils";

export const clipboardsQueryKey = ["clipboards"] as const;

export function useClipboardsQuery() {
  return useQuery({
    queryKey: clipboardsQueryKey,
    queryFn: () => apiGet<ClipboardListResponse>("/api/clipboards"),
  });
}

export function ClipboardList({ activeId }: { activeId?: string | null }) {
  const router = useRouter();
  const { data, isLoading, error } = useClipboardsQuery();
  const storeId = useActiveClipboard((s) => s.id);
  const effectiveActiveId = storeId ?? activeId ?? null;
  const open = useListDrawer((s) => s.open);
  const close = useListDrawer((s) => s.close);

  // 移动端抽屉打开时：ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const items = data?.items ?? [];
  const pinnedCount = items.filter((i) => i.pinned_at !== null).length;

  return (
    <>
      {/* 移动端遮罩：抽屉打开时显示 · 点击关闭 —— 从 TopBar(h-14) 下方开始，避免盖住顶栏 */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-x-0 bottom-0 top-14 z-30 bg-black/40 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          // 基础：flex column + 边框背景
          "flex min-h-0 flex-col border-r border-line bg-bg",
          // 移动端：overlay 抽屉（从左滑入），默认 -translate 隐藏；top-14 让出 TopBar 高度
          "fixed bottom-0 left-0 top-14 z-30 w-[85%] max-w-[320px] shadow-pop transition-transform duration-200 ease-crisp",
          open ? "translate-x-0" : "-translate-x-full",
          // 桌面：静态左栏，宽 320，固定位置
          "md:static md:w-[320px] md:shrink-0 md:translate-x-0 md:shadow-none",
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-s-3 border-b border-line bg-[color-mix(in_srgb,var(--c-bg)_90%,var(--c-bg-raise))] px-s-4 py-s-4">
          <h2 className="inline-flex items-center text-[15px] font-semibold">
            我的空间
            <span className="ml-s-2 font-mono text-[11px] font-normal text-text-dim">
              {items.length} 条{pinnedCount > 0 ? ` · ${pinnedCount} 置顶` : ""}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => {
              close();
              router.push("/c/new");
            }}
            className="inline-flex h-7 items-center gap-s-1 rounded-md px-s-3 font-head text-[12px] font-medium text-text-mute transition-colors hover:bg-bg-sunk hover:text-text"
            title="新建剪贴板"
          >
            <Plus className="h-3.5 w-3.5" />
            新建
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-safe">
          {isLoading && (
            <div className="px-s-6 py-s-8 text-center text-[13px] text-text-dim">
              加载中…
            </div>
          )}
          {error && (
            <div className="px-s-6 py-s-8 text-center text-[13px] text-danger">
              列表加载失败
            </div>
          )}
          {!isLoading && !error && items.length === 0 && (
            <div className="px-s-6 py-s-12 text-center">
              <div className="font-head text-[15px] font-semibold">空空如也</div>
              <div className="mt-s-2 text-[13px] text-text-mute">
                点击右上方「新建」开始记录第一条剪贴板。
              </div>
            </div>
          )}
          {items.map((item) => {
            const active = item.id === effectiveActiveId;
            const pinned = item.pinned_at !== null;
            const preview = item.text.trim() || "（仅附件）";
            return (
              <Link
                key={item.id}
                href={`/c/${item.id}`}
                onClick={close}
                className={cn(
                  "relative grid grid-cols-[16px_1fr_auto] items-start gap-s-3 border-b border-line px-s-4 py-s-3 transition-colors",
                  active
                    ? "bg-accent-soft before:absolute before:bottom-s-2 before:left-0 before:top-s-2 before:w-[3px] before:rounded-r-sm before:bg-accent before:content-['']"
                    : "hover:bg-bg-sunk",
                )}
              >
                <div className="pt-0.5">
                  {pinned && (
                    <Pin
                      className="h-3 w-3 text-accent"
                      fill="currentColor"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "line-clamp-2 text-[13px] leading-[1.5]",
                      !item.text.trim() && "text-text-dim italic",
                    )}
                  >
                    {preview}
                  </div>
                  <div className="mt-s-1 flex items-center gap-s-3 font-mono text-[11px] text-text-dim">
                    <span>{formatRelative(item.updated_at)}</span>
                    {item.attachment_count > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" />
                        {item.attachment_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-text-dim">
                  {formatTimeHM(item.updated_at)}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
