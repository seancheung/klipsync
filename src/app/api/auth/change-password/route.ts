import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/middleware";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  readRawSessionToken,
  revokeSession,
  writeSessionCookie,
} from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { changePasswordSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const { user } = await requireUser();
  const payload = changePasswordSchema.parse(await req.json());

  const ok = await verifyPassword(user.passwordHash, payload.oldPassword);
  if (!ok) throw ApiError.invalidCredentials("旧密码不正确");

  if (payload.oldPassword === payload.newPassword) {
    throw ApiError.conflict("新密码不能与旧密码相同");
  }

  const newHash = await hashPassword(payload.newPassword);
  const now = Date.now();
  db.update(users)
    .set({ passwordHash: newHash, updatedAt: now })
    .where(eq(users.id, user.id))
    .run();

  // 轮换 session：吊销当前 token，签发新 token
  const cookieStore = await cookies();
  const oldToken = readRawSessionToken(cookieStore);
  if (oldToken) await revokeSession(oldToken);
  const { token } = await createSession({
    userId: user.id,
    remember: true,
    userAgent: req.headers.get("user-agent"),
  });
  writeSessionCookie(cookieStore, token, true);

  return NextResponse.json({ ok: true });
});
