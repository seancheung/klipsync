import type { ApiErrorBody } from "./types";

/**
 * 客户端 fetch 薄封装：统一错误抛出，Content-Type 默认 JSON。
 * 所有 4xx/5xx 抛 ApiClientError，字段与 Route Handler 的错误信封一致。
 */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseError(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiClientError(
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? res.statusText,
      body.error?.details,
    );
  } catch {
    return new ApiClientError(res.status, "UNKNOWN", res.statusText);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function apiJson<T>(
  url: string,
  init: { method: "POST" | "PATCH" | "DELETE" | "PUT"; body?: unknown },
): Promise<T> {
  const res = await fetch(url, {
    method: init.method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
