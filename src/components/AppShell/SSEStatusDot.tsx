"use client";

import { useSSEStatus } from "@/lib/store/sse-status";
import { cn } from "@/lib/utils";

/**
 * TopBar 上的 SSE 连接状态指示灯 —— tasks.md T-304
 * open=绿 / connecting=黄(脉冲) / closed=红
 */
export function SSEStatusDot() {
  const status = useSSEStatus((s) => s.status);

  const label =
    status === "open"
      ? "实时同步已连接"
      : status === "connecting"
        ? "正在连接…"
        : "未连接";

  return (
    <span
      className="inline-flex items-center gap-s-2 font-mono text-[11px] text-text-dim"
      title={label}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "open" && "bg-success",
          status === "connecting" && "animate-pulse bg-warn",
          status === "closed" && "bg-danger",
        )}
      />
      <span className="sr-only md:not-sr-only md:inline">{label}</span>
    </span>
  );
}
