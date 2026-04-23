import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/middleware";
import { withErrorBoundary } from "@/lib/http/handler";
import type { SseEvent } from "@/lib/sse/events";
import { subscribe } from "@/lib/sse/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

function formatEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// GET /api/stream —— SSE 订阅，technical.md §6
export const GET = withErrorBoundary(async (req: NextRequest) => {
  const { user } = await requireUser();
  const userId = user.id;

  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      function enqueue(chunk: string): boolean {
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          // controller 已被 close / abort —— 触发清理链
          cleanup();
          return false;
        }
      }

      function cleanup() {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
      }

      // 首帧先发一次注释，触发下游立即把响应头刷给客户端
      enqueue(`:ok\n\n`);

      unsubscribe = subscribe(userId, (event) => {
        enqueue(formatEvent(event));
      });

      heartbeatTimer = setInterval(() => {
        // enqueue 返回 false 时 cleanup 已跑过
        enqueue(`:heartbeat\n\n`);
      }, HEARTBEAT_MS);

      // 客户端关闭 / 反代超时 / 浏览器刷新 → 触发 abort → 清理订阅
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // 反代（特别是 Nginx）的默认 buffering 会把 SSE 憋住；显式关掉
      "X-Accel-Buffering": "no",
    },
  });
});
