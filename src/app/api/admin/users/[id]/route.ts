import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/middleware";
import { db, getSqlite } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { safeRmrf, userAttachmentsDir } from "@/lib/storage/files";

export const runtime = "nodejs";

type Params = { id: string };

// DELETE /api/admin/users/:id —— FR-051
export const DELETE = withErrorBoundary<Params>(async (_req, ctx) => {
  const { user: caller } = await requireAdmin();
  const { id } = await ctx.params;

  const sqlite = getSqlite();
  sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    const target = db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!target) {
      sqlite.prepare("ROLLBACK").run();
      throw ApiError.notFound();
    }

    // 若删除的是 admin，必须保证还有另一个 admin 存在
    if (target.role === "admin") {
      const othersCount = db
        .select({ n: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.id, id)))
        .get();
      if (!othersCount || Number(othersCount.n) === 0) {
        sqlite.prepare("ROLLBACK").run();
        throw ApiError.conflict("不能删除系统中最后一个管理员");
      }
    }

    // FK CASCADE 会清 clipboards / attachments / sessions
    db.delete(users).where(eq(users.id, id)).run();
    sqlite.prepare("COMMIT").run();
  } catch (err) {
    try {
      sqlite.prepare("ROLLBACK").run();
    } catch {
      /* already committed or rolled back */
    }
    throw err;
  }

  // 通知目标用户所有在线端口强制下线；目标若就是调用者自身，同样广播
  try {
    publish(id, { type: "session.revoked" });
  } catch (err) {
    console.error("[sse] publish session.revoked (user delete) failed:", err);
  }

  // 异步清磁盘附件目录；失败交给孤儿 GC
  void safeRmrf(userAttachmentsDir(id));

  // 若 admin 删的是自己（同 id 属 admin 且不是最后一个），调用方随后将因
  // session 被级联删除而自然登出；这里返回元信息便于前端判断
  return NextResponse.json({
    id,
    deleted: true,
    self: caller.id === id,
  });
});
