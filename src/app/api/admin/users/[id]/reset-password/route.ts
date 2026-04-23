import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ApiError } from "@/lib/http/errors";
import { withErrorBoundary } from "@/lib/http/handler";
import { publish } from "@/lib/sse/hub";
import { adminResetPasswordSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type Params = { id: string };

// POST /api/admin/users/:id/reset-password —— FR-052
export const POST = withErrorBoundary<Params>(async (req: NextRequest, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const payload = adminResetPasswordSchema.parse(await req.json());

  const target = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .get();
  if (!target) throw ApiError.notFound();

  const passwordHash = await hashPassword(payload.password);
  const now = Date.now();

  db.update(users)
    .set({ passwordHash, mustReset: 1, updatedAt: now })
    .where(eq(users.id, id))
    .run();

  await revokeAllSessionsForUser(id);

  try {
    publish(id, { type: "session.revoked" });
  } catch (err) {
    console.error("[sse] publish session.revoked (reset password) failed:", err);
  }

  return NextResponse.json({ id, ok: true });
});
