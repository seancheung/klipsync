import { z } from "zod";

/**
 * SSE 事件载荷 —— technical.md §6
 *
 * 服务端 publish 前用这些 schema 校验；客户端解析 `data` JSON 后用
 * `sseEventSchema.safeParse` 过滤掉格式异常的事件（升级期若两端不匹配，
 * 宁可丢事件也不要让 UI 崩）。
 */

const attachmentMetaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  created_at: z.number().int(),
});

export const clipboardCreatedSchema = z.object({
  type: z.literal("clipboard.created"),
  id: z.string(),
  text: z.string(),
  pinned_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  attachment_count: z.number().int().nonnegative(),
});

export const clipboardUpdatedSchema = z.object({
  type: z.literal("clipboard.updated"),
  id: z.string(),
  fields: z.object({
    text: z.string().optional(),
    pinned_at: z.number().int().nullable().optional(),
    cleared: z.literal(true).optional(),
    updated_at: z.number().int(),
  }),
});

export const clipboardDeletedSchema = z.object({
  type: z.literal("clipboard.deleted"),
  id: z.string(),
});

export const attachmentAddedSchema = z.object({
  type: z.literal("attachment.added"),
  clipboard_id: z.string(),
  attachment: attachmentMetaSchema,
  updated_at: z.number().int(),
});

export const attachmentRemovedSchema = z.object({
  type: z.literal("attachment.removed"),
  clipboard_id: z.string(),
  id: z.string(),
  updated_at: z.number().int(),
});

export const sessionRevokedSchema = z.object({
  type: z.literal("session.revoked"),
});

export const sseEventSchema = z.discriminatedUnion("type", [
  clipboardCreatedSchema,
  clipboardUpdatedSchema,
  clipboardDeletedSchema,
  attachmentAddedSchema,
  attachmentRemovedSchema,
  sessionRevokedSchema,
]);

export type ClipboardCreatedEvent = z.infer<typeof clipboardCreatedSchema>;
export type ClipboardUpdatedEvent = z.infer<typeof clipboardUpdatedSchema>;
export type ClipboardDeletedEvent = z.infer<typeof clipboardDeletedSchema>;
export type AttachmentAddedEvent = z.infer<typeof attachmentAddedSchema>;
export type AttachmentRemovedEvent = z.infer<typeof attachmentRemovedSchema>;
export type SessionRevokedEvent = z.infer<typeof sessionRevokedSchema>;
export type SseEvent = z.infer<typeof sseEventSchema>;
export type SseEventType = SseEvent["type"];
