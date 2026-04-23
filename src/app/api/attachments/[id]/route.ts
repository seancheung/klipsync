import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { requireOwnedAttachment, requireUser } from "@/lib/auth/middleware";
import { db, getSqlite } from "@/lib/db/client";
import { attachments, clipboards } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { attachmentPath, safeUnlink } from "@/lib/storage/files";

export const runtime = "nodejs";

type Params = { id: string };

// DELETE /api/attachments/:id —— FR-020
export const DELETE = withErrorBoundary<Params>(async (_req, ctx) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  await requireOwnedAttachment(user.id, id);

  const row = db
    .select({ id: attachments.id, clipboardId: attachments.clipboardId })
    .from(attachments)
    .where(eq(attachments.id, id))
    .get();
  if (!row) throw ApiError.notFound();

  const now = Date.now();
  const sqlite = getSqlite();
  sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    db.delete(attachments).where(eq(attachments.id, id)).run();
    db.update(clipboards)
      .set({ updatedAt: now })
      .where(eq(clipboards.id, row.clipboardId))
      .run();
    sqlite.prepare("COMMIT").run();
  } catch (err) {
    try {
      sqlite.prepare("ROLLBACK").run();
    } catch {
      /* noop */
    }
    throw err;
  }

  void safeUnlink(attachmentPath(user.id, row.clipboardId, row.id));

  try {
    publish(user.id, {
      type: "attachment.removed",
      clipboard_id: row.clipboardId,
      id,
      updated_at: now,
    });
  } catch (err) {
    console.error("[sse] publish attachment.removed failed:", err);
  }

  return NextResponse.json({ id, deleted: true });
});
