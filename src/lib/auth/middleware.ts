import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attachments, clipboards, type User } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";

import { readSession, type SessionWithUser } from "./session";

/**
 * 鉴权 / 越权 guard —— technical.md §7
 *
 * 用法：
 *   const { user, session } = await requireUser();              // 普通已登录
 *   const { user } = await requireUser({ allowMustReset: true });// 允许 must_reset 用户通过（给 /api/auth/force-reset 用）
 *   const { user } = await requireAdmin();                      // admin
 *   await requireOwnedClipboard(user.id, id);
 *   await requireOwnedAttachment(user.id, id);
 *
 * 非己对象一律抛 NOT_FOUND，不区分"不存在"与"无权访问"（§5）。
 */

export type RequireUserResult = {
  session: SessionWithUser;
  user: User;
};

export async function requireUser(options?: {
  allowMustReset?: boolean;
}): Promise<RequireUserResult> {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore);
  if (!session) throw ApiError.unauthenticated();

  if (session.user.mustReset === 1 && !options?.allowMustReset) {
    throw ApiError.mustReset();
  }

  return { session, user: session.user };
}

export async function requireAdmin(): Promise<RequireUserResult> {
  const result = await requireUser();
  if (result.user.role !== "admin") {
    throw ApiError.forbidden();
  }
  return result;
}

export async function requireOwnedClipboard(
  userId: string,
  clipboardId: string,
): Promise<void> {
  const row = db
    .select({ userId: clipboards.userId })
    .from(clipboards)
    .where(eq(clipboards.id, clipboardId))
    .get();
  if (!row || row.userId !== userId) {
    throw ApiError.notFound();
  }
}

export async function requireOwnedAttachment(
  userId: string,
  attachmentId: string,
): Promise<void> {
  const row = db
    .select({ userId: attachments.userId })
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .get();
  if (!row || row.userId !== userId) {
    throw ApiError.notFound();
  }
}
