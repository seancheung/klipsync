import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  readRawSessionToken,
  revokeSession,
} from "@/lib/auth/session";
import { withErrorBoundary } from "@/lib/http/handler";

export const runtime = "nodejs";

export const POST = withErrorBoundary(async () => {
  const cookieStore = await cookies();
  const token = readRawSessionToken(cookieStore);
  if (token) {
    await revokeSession(token);
  }
  clearSessionCookie(cookieStore);
  return NextResponse.json({ ok: true });
});
