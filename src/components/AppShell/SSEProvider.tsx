"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useClipboardListSync } from "@/hooks/useClipboardSync";
import {
  closeSSEConnection,
  useSSEConnection,
  useSSESubscribe,
} from "@/hooks/useSSE";

/**
 * 顶层挂载 SSE 连接 —— technical.md §6 / tasks.md T-304
 *
 * 仅在已登录的 (app) 路由组下渲染（由 layout 的 requireUser 保证）。
 * 负责：
 * - 打开并维护全局唯一的 EventSource
 * - 接收 session.revoked 时强制关闭连接并跳转 /login
 */
export function SSEProvider({ children }: { children: React.ReactNode }) {
  useSSEConnection();
  useClipboardListSync();
  const router = useRouter();

  const onSessionRevoked = useCallback(() => {
    closeSSEConnection();
    toast.info("会话已在其他设备上终止，请重新登录。");
    router.replace("/login");
  }, [router]);

  useSSESubscribe("session.revoked", onSessionRevoked);

  return <>{children}</>;
}
