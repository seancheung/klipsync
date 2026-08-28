import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { requireOwnedAttachment, requireUser } from "@/lib/auth/middleware";
import { db } from "@/lib/db/client";
import { attachments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { attachmentPath } from "@/lib/storage/files";

export const runtime = "nodejs";

type Params = { id: string };

// GET /api/attachments/:id/download —— FR-019
// 图片可通过 ?inline=1 在浏览器中直接查看，其他类型始终作为附件下载。
export const GET = withErrorBoundary<Params>(async (req, ctx) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  await requireOwnedAttachment(user.id, id);

  const row = db
    .select({
      id: attachments.id,
      clipboardId: attachments.clipboardId,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
      sizeBytes: attachments.sizeBytes,
    })
    .from(attachments)
    .where(eq(attachments.id, id))
    .get();
  if (!row) throw ApiError.notFound();

  const path = attachmentPath(user.id, row.clipboardId, row.id);
  try {
    await stat(path);
  } catch {
    throw ApiError.notFound();
  }

  const nodeStream = createReadStream(path);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  // RFC 5987 filename* 编码，保证中文/非 ASCII 文件名正确
  const encoded = encodeURIComponent(row.filename).replace(/['()]/g, escape);
  const inline =
    req.nextUrl.searchParams.get("inline") === "1" &&
    row.mimeType.startsWith("image/");

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(inline ? { "Content-Security-Policy": "sandbox" } : {}),
    },
  });
});
