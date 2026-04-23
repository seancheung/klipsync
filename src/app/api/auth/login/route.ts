import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { verifyPassword } from "@/lib/auth/password";
import { createSession, writeSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { check, clientIp, computeIdentifier, record } from "@/lib/rate-limit/login";
import { loginSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const raw = (await req.json()) as Record<string, unknown>;
  const payload = loginSchema.parse({ remember: true, ...raw });
  const ip = clientIp(req.headers, env.TRUST_PROXY);
  const identifier = computeIdentifier(payload.username, ip);

  const limit = check(identifier);
  if (limit.blocked) {
    throw ApiError.rateLimited(limit.retryAfterSec);
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.username, payload.username))
    .get();

  if (!user) {
    record(identifier, false);
    throw ApiError.invalidCredentials();
  }

  const ok = await verifyPassword(user.passwordHash, payload.password);
  if (!ok) {
    record(identifier, false);
    throw ApiError.invalidCredentials();
  }

  record(identifier, true);

  const { token } = await createSession({
    userId: user.id,
    remember: payload.remember,
    userAgent: req.headers.get("user-agent"),
  });
  const cookieStore = await cookies();
  writeSessionCookie(cookieStore, token, payload.remember);

  return NextResponse.json({
    must_reset: user.mustReset === 1,
  });
});
