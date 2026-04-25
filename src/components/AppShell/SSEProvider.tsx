"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useClipboardListSync } from "@/hooks/useClipboardSync";
import {
  closeSSEConnection,
  reopenSSEConnection,
  useSSEConnection,
  useSSESubscribe,
} from "@/hooks/useSSE";
import { useActiveClipboard } from "@/lib/store/active-clipboard";

/**
 * 页面可见性 → SSE 同步开关。
 * - tab 隐藏：关闭 EventSource（节省长连接 / heartbeat）
 * - tab 可见：invalidate 列表与当前打开的详情，并重开 SSE
 *
 * 仅监听 `visibilitychange`，与 TanStack Query `refetchOnWindowFocus` 时机一致；
 * 跨窗口焦点切换不暂停（多窗口同步是合理诉求）。
 */
function useFocusAwareSync(): void {
  const qc = useQueryClient();

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        closeSSEConnection();
        return;
      }
      qc.invalidateQueries({ queryKey: ["clipboards"] });
      const activeId = useActiveClipboard.getState().id;
      if (activeId) {
        qc.invalidateQueries({ queryKey: ["clipboard", activeId] });
      }
      reopenSSEConnection();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [qc]);
}

/**
 * 顶层挂载 SSE 连接 —— technical.md §6 / tasks.md T-304
 *
 * 仅在已登录的 (app) 路由组下渲染（由 layout 的 requireUser 保证）。
 * 负责：
 * - 打开并维护全局唯一的 EventSource
 * - 页面离焦暂停同步、聚焦立即重取并恢复
 * - 接收 session.revoked 时强制关闭连接并跳转 /login
 */
export function SSEProvider({ children }: { children: React.ReactNode }) {
  useSSEConnection();
  useClipboardListSync();
  useFocusAwareSync();
  const router = useRouter();

  const onSessionRevoked = useCallback(() => {
    closeSSEConnection();
    toast.info("会话已在其他设备上终止，请重新登录。");
    router.replace("/login");
  }, [router]);

  useSSESubscribe("session.revoked", onSessionRevoked);

  return <>{children}</>;
}
