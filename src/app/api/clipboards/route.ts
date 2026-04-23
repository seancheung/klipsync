import { NextResponse, type NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth/middleware";
import { db } from "@/lib/db/client";
import { attachments, clipboards } from "@/lib/db/schema";
import { newId } from "@/lib/db/ulid";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { clipboardCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const PREVIEW_MAX = 160;

function truncate(text: string): string {
  return text.length > PREVIEW_MAX ? text.slice(0, PREVIEW_MAX) : text;
}

// GET /api/clipboards —— FR-010 / FR-031
export const GET = withErrorBoundary(async () => {
  const { user } = await requireUser();

  const rows = db
    .select({
      id: clipboards.id,
      text: clipboards.text,
      pinnedAt: clipboards.pinnedAt,
      createdAt: clipboards.createdAt,
      updatedAt: clipboards.updatedAt,
      attachmentCount: sql<number>`(SELECT COUNT(*) FROM ${attachments} WHERE ${attachments.clipboardId} = ${clipboards.id})`,
    })
    .from(clipboards)
    .where(eq(clipboards.userId, user.id))
    .orderBy(
      // NULL 排在有值之后 —— SQLite 默认 NULLS FIRST for DESC；手动用 CASE 模拟 NULLS LAST
      sql`CASE WHEN ${clipboards.pinnedAt} IS NULL THEN 1 ELSE 0 END`,
      desc(clipboards.pinnedAt),
      desc(clipboards.updatedAt),
    )
    .all();

  const items = rows.map((r) => ({
    id: r.id,
    text: truncate(r.text),
    pinned_at: r.pinnedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    attachment_count: Number(r.attachmentCount ?? 0),
  }));

  return NextResponse.json({ items });
});

// POST /api/clipboards —— FR-011 / FR-014
export const POST = withErrorBoundary(async (req: NextRequest) => {
  const { user } = await requireUser();
  const payload = clipboardCreateSchema.parse(await req.json().catch(() => ({})));

  const id = newId();
  const now = Date.now();

  db.insert(clipboards)
    .values({
      id,
      userId: user.id,
      text: payload.text ?? "",
      pinnedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  try {
    publish(user.id, {
      type: "clipboard.created",
      id,
      text: payload.text ?? "",
      pinned_at: null,
      created_at: now,
      updated_at: now,
      attachment_count: 0,
    });
  } catch (err) {
    console.error("[sse] publish clipboard.created failed:", err);
  }

  return NextResponse.json(
    {
      id,
      text: payload.text ?? "",
      pinned_at: null,
      created_at: now,
      updated_at: now,
      attachments: [],
    },
    { status: 201 },
  );
});
