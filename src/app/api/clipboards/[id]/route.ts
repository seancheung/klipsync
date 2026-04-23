import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";

import { requireOwnedClipboard, requireUser } from "@/lib/auth/middleware";
import { db, getSqlite } from "@/lib/db/client";
import { attachments, clipboards } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { attachmentDir, safeRmrf } from "@/lib/storage/files";
import { clipboardPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type Params = { id: string };

// GET /api/clipboards/:id —— FR-011
export const GET = withErrorBoundary<Params>(async (_req, ctx) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  await requireOwnedClipboard(user.id, id);

  const clip = db
    .select()
    .from(clipboards)
    .where(eq(clipboards.id, id))
    .get();
  if (!clip) throw ApiError.notFound();

  const atts = db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
      sizeBytes: attachments.sizeBytes,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.clipboardId, id))
    .orderBy(asc(attachments.createdAt))
    .all();

  return NextResponse.json({
    id: clip.id,
    text: clip.text,
    pinned_at: clip.pinnedAt,
    created_at: clip.createdAt,
    updated_at: clip.updatedAt,
    attachments: atts.map((a) => ({
      id: a.id,
      filename: a.filename,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      created_at: a.createdAt,
    })),
  });
});

// PATCH /api/clipboards/:id —— FR-013 / FR-021 / FR-022
export const PATCH = withErrorBoundary<Params>(async (req: NextRequest, ctx) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  await requireOwnedClipboard(user.id, id);

  const payload = clipboardPatchSchema.parse(await req.json());
  const now = Date.now();
  const sqlite = getSqlite();

  if ("text" in payload) {
    db.update(clipboards)
      .set({ text: payload.text, updatedAt: now })
      .where(eq(clipboards.id, id))
      .run();
    try {
      publish(user.id, {
        type: "clipboard.updated",
        id,
        fields: { text: payload.text, updated_at: now },
      });
    } catch (err) {
      console.error("[sse] publish clipboard.updated (text) failed:", err);
    }
    return NextResponse.json({ id, text: payload.text, updated_at: now });
  }

  if ("pinned" in payload) {
    const pinnedAt = payload.pinned ? now : null;
    db.update(clipboards)
      .set({ pinnedAt, updatedAt: now })
      .where(eq(clipboards.id, id))
      .run();
    try {
      publish(user.id, {
        type: "clipboard.updated",
        id,
        fields: { pinned_at: pinnedAt, updated_at: now },
      });
    } catch (err) {
      console.error("[sse] publish clipboard.updated (pinned) failed:", err);
    }
    return NextResponse.json({ id, pinned_at: pinnedAt, updated_at: now });
  }

  // clear: 事务内清文本 + 删所有附件行；成功后异步 rm -rf 附件目录
  sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    db.update(clipboards)
      .set({ text: "", updatedAt: now })
      .where(eq(clipboards.id, id))
      .run();
    db.delete(attachments).where(eq(attachments.clipboardId, id)).run();
    sqlite.prepare("COMMIT").run();
  } catch (err) {
    try {
      sqlite.prepare("ROLLBACK").run();
    } catch {
      /* already committed or rolled back */
    }
    throw err;
  }
  // 异步清磁盘；失败交给孤儿 GC
  void safeRmrf(attachmentDir(user.id, id));

  try {
    publish(user.id, {
      type: "clipboard.updated",
      id,
      fields: { cleared: true, text: "", updated_at: now },
    });
  } catch (err) {
    console.error("[sse] publish clipboard.updated (clear) failed:", err);
  }
  return NextResponse.json({ id, cleared: true, updated_at: now });
});

// DELETE /api/clipboards/:id —— FR-018
export const DELETE = withErrorBoundary<Params>(async (_req, ctx) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  await requireOwnedClipboard(user.id, id);

  // FK CASCADE 会把 attachments 行也清掉；事务里只需 DELETE clipboards
  db.delete(clipboards).where(eq(clipboards.id, id)).run();

  // 异步清磁盘；失败交给孤儿 GC
  void safeRmrf(attachmentDir(user.id, id));

  try {
    publish(user.id, { type: "clipboard.deleted", id });
  } catch (err) {
    console.error("[sse] publish clipboard.deleted failed:", err);
  }
  return NextResponse.json({ id, deleted: true });
});
