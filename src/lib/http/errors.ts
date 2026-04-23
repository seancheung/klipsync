import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

/**
 * 错误码约定 —— 对应 technical.md §5
 * 新增错误码记得同步到：
 *   - 前端 i18n / toast 文案表
 *   - API 设计表里的 `error.code` 列
 */
export const ERROR_CODES = {
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  MUST_RESET: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  SERVER: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }

  static unauthenticated(message = "未登录") {
    return new ApiError("UNAUTHENTICATED", message);
  }
  static invalidCredentials(message = "用户名或密码错误") {
    return new ApiError("INVALID_CREDENTIALS", message);
  }
  static mustReset(message = "必须先完成强制改密") {
    return new ApiError("MUST_RESET", message);
  }
  static forbidden(message = "无权限") {
    return new ApiError("FORBIDDEN", message);
  }
  static notFound(message = "对象不存在") {
    return new ApiError("NOT_FOUND", message);
  }
  static validation(details: unknown, message = "请求参数校验失败") {
    return new ApiError("VALIDATION", message, details);
  }
  static rateLimited(retryAfterSec: number, message = "请求过于频繁") {
    return new ApiError("RATE_LIMITED", message, { retryAfterSec });
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError("CONFLICT", message, details);
  }
  static payloadTooLarge(message = "附件超出大小限制") {
    return new ApiError("PAYLOAD_TOO_LARGE", message);
  }
  static server(message = "服务器内部错误", details?: unknown) {
    return new ApiError("SERVER", message, details);
  }
}

function body(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

/** 把任意异常映射为 NextResponse（§5 错误信封）。 */
export function toResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (err.code === "RATE_LIMITED") {
      const retryAfter = (err.details as { retryAfterSec?: number } | undefined)?.retryAfterSec;
      if (retryAfter !== undefined) headers["Retry-After"] = String(retryAfter);
    }
    return NextResponse.json(body(err.code, err.message, err.details), {
      status: err.status,
      headers,
    });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      body("VALIDATION", "请求参数校验失败", z.treeifyError(err)),
      { status: 400 },
    );
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json(body("SERVER", message), { status: 500 });
}
