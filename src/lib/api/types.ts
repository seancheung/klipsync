/**
 * 前后端共享的 API 响应类型（服务端 route handler 返回、客户端 fetch 解析）。
 * 严格与 route.ts 的 NextResponse.json(...) 字段保持一致。
 */

export type ClipboardListItem = {
  id: string;
  text: string; // 列表场景下已截断到 160 字符
  pinned_at: number | null;
  created_at: number;
  updated_at: number;
  attachment_count: number;
};

export type ClipboardListResponse = {
  items: ClipboardListItem[];
};

export type AttachmentMeta = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
};

export type ClipboardDetail = {
  id: string;
  text: string;
  pinned_at: number | null;
  created_at: number;
  updated_at: number;
  attachments: AttachmentMeta[];
};

export type AdminUserItem = {
  id: string;
  username: string;
  role: "admin" | "user";
  must_reset: boolean;
  created_at: number;
  clipboard_count: number;
  storage_bytes: number;
};

export type AdminUserListResponse = {
  items: AdminUserItem[];
};

export type AdminConfigResponse = {
  max_attachment_mb: number;
  public_base_url: string;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};
