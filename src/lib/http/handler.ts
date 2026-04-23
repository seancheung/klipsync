import type { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createLogger } from "@/lib/log";

import { ApiError, toResponse } from "./errors";

type RouteContext<P = Record<string, string>> = { params: Promise<P> };

const apiLog = createLogger("api");

/**
 * 高阶包装：把 Route Handler 的 ApiError / ZodError / 未知异常统一转成
 * §5 的错误信封，并打结构化日志。所有 /api/* route.ts 都应该经过它。
 *
 * 日志策略（T-503）：
 *   - 5xx：error 级 + stack（便于排查）
 *   - 4xx：warn 级 + code（仅标识，不含栈）
 *   - 2xx：默认不打 —— 避免刷屏；需要时在 handler 内部自行打 info
 *
 * 用法：
 *   export const POST = withErrorBoundary(async (req, ctx) => { ... });
 */
export function withErrorBoundary<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const response: NextResponse = toResponse(err);
      const base = {
        method: req.method,
        path: new URL(req.url).pathname,
        status: response.status,
      };

      if (response.status >= 500) {
        apiLog.error("unhandled error", {
          ...base,
          err: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      } else if (err instanceof ApiError) {
        apiLog.warn("api error", { ...base, code: err.code });
      } else if (err instanceof ZodError) {
        apiLog.warn("validation error", { ...base, code: "VALIDATION" });
      }

      return response;
    }
  };
}
