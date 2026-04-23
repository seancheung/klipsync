import { NextResponse, type NextRequest } from "next/server";
import { asc, eq, sql } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { attachments, clipboards, users } from "@/lib/db/schema";
import { newId } from "@/lib/db/ulid";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { adminCreateUserSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// GET /api/admin/users —— FR-050 / FR-053
export const GET = withErrorBoundary(async () => {
  await requireAdmin();

  const rows = db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      mustReset: users.mustReset,
      createdAt: users.createdAt,
      clipboardCount: sql<number>`(SELECT COUNT(*) FROM ${clipboards} WHERE ${clipboards.userId} = ${users.id})`,
      storageBytes: sql<number>`(SELECT COALESCE(SUM(${attachments.sizeBytes}), 0) FROM ${attachments} WHERE ${attachments.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(asc(users.createdAt))
    .all();

  const items = rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role as "admin" | "user",
    must_reset: r.mustReset === 1,
    created_at: r.createdAt,
    clipboard_count: Number(r.clipboardCount ?? 0),
    storage_bytes: Number(r.storageBytes ?? 0),
  }));

  return NextResponse.json({ items });
});

// POST /api/admin/users —— FR-050
export const POST = withErrorBoundary(async (req: NextRequest) => {
  await requireAdmin();
  const payload = adminCreateUserSchema.parse(await req.json());

  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, payload.username))
    .get();
  if (existing) {
    throw ApiError.conflict("用户名已存在");
  }

  const id = newId();
  const now = Date.now();
  const passwordHash = await hashPassword(payload.password);

  db.insert(users)
    .values({
      id,
      username: payload.username,
      passwordHash,
      role: "user",
      mustReset: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return NextResponse.json(
    {
      id,
      username: payload.username,
      role: "user",
      must_reset: true,
      created_at: now,
      clipboard_count: 0,
      storage_bytes: 0,
    },
    { status: 201 },
  );
});
