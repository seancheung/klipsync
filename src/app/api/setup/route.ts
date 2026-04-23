import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { createSession, writeSessionCookie } from "@/lib/auth/session";
import { db, getSqlite } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { newId } from "@/lib/db/ulid";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { setupSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const GET = withErrorBoundary(async () => {
  const row = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();
  return NextResponse.json({ initialized: row !== undefined });
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const payload = setupSchema.parse(await req.json());
  const passwordHash = await hashPassword(payload.password);
  const now = Date.now();
  const newUserId = newId();
  const sqlite = getSqlite();

  // technical.md §13 风险表："并发 setup" —— 用 BEGIN IMMEDIATE 把 COUNT + INSERT
  // 串起来，争用时后到者拿到 COUNT>0 直接 409。
  let inserted = false;
  sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .get();
    if (existing) {
      sqlite.prepare("ROLLBACK").run();
      throw ApiError.conflict("系统已完成初始化");
    }
    db.insert(users)
      .values({
        id: newUserId,
        username: payload.username,
        passwordHash,
        role: "admin",
        mustReset: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    sqlite.prepare("COMMIT").run();
    inserted = true;
  } catch (err) {
    if (!inserted) {
      try {
        sqlite.prepare("ROLLBACK").run();
      } catch {
        // 已 commit 或已 rollback —— 忽略
      }
    }
    throw err;
  }

  const { token } = await createSession({
    userId: newUserId,
    remember: true,
    userAgent: req.headers.get("user-agent"),
  });
  const cookieStore = await cookies();
  writeSessionCookie(cookieStore, token, true);

  return NextResponse.json({ ok: true, userId: newUserId }, { status: 201 });
});
