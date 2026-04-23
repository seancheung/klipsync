import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireOwnedClipboard, requireUser } from "@/lib/auth/middleware";
import { getMaxAttachmentMb } from "@/lib/config/system";
import { db, getSqlite } from "@/lib/db/client";
import { attachments, clipboards } from "@/lib/db/schema";
import { newId } from "@/lib/db/ulid";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { atomicWrite, attachmentPath, safeUnlink } from "@/lib/storage/files";

export const runtime = "nodejs";

type Params = { id: string };

// POST /api/clipboards/:id/attachments —— FR-017
export const POST = withErrorBoundary<Params>(async (req: NextRequest, ctx) => {
  const { user } = await requireUser();
  const { id: clipboardId } = await ctx.params;
  await requireOwnedClipboard(user.id, clipboardId);

  const form = await req.formData();
  const fileField = form.get("file");
  if (!(fileField instanceof File) || fileField.size === 0) {
    throw ApiError.validation({ file: ["缺少文件"] });
  }
  const maxBytes = getMaxAttachmentMb() * 1024 * 1024;
  if (fileField.size > maxBytes) throw ApiError.payloadTooLarge();

  const fileId = newId();
  const now = Date.now();
  const target = attachmentPath(user.id, clipboardId, fileId);
  const buffer = Buffer.from(await fileField.arrayBuffer());

  await atomicWrite(buffer, target);

  const sqlite = getSqlite();
  try {
    sqlite.prepare("BEGIN IMMEDIATE").run();
    db.insert(attachments)
      .values({
        id: fileId,
        clipboardId,
        userId: user.id,
        filename: fileField.name || fileId,
        mimeType: fileField.type || "application/octet-stream",
        sizeBytes: fileField.size,
        createdAt: now,
      })
      .run();
    db.update(clipboards)
      .set({ updatedAt: now })
      .where(eq(clipboards.id, clipboardId))
      .run();
    sqlite.prepare("COMMIT").run();
  } catch (err) {
    try {
      sqlite.prepare("ROLLBACK").run();
    } catch {
      /* noop */
    }
    // 补偿：事务失败则删除已写入文件
    void safeUnlink(target);
    throw err;
  }

  try {
    publish(user.id, {
      type: "attachment.added",
      clipboard_id: clipboardId,
      attachment: {
        id: fileId,
        filename: fileField.name || fileId,
        mime_type: fileField.type || "application/octet-stream",
        size_bytes: fileField.size,
        created_at: now,
      },
      updated_at: now,
    });
  } catch (err) {
    console.error("[sse] publish attachment.added failed:", err);
  }

  return NextResponse.json(
    {
      id: fileId,
      clipboard_id: clipboardId,
      filename: fileField.name || fileId,
      mime_type: fileField.type || "application/octet-stream",
      size_bytes: fileField.size,
      created_at: now,
    },
    { status: 201 },
  );
});
