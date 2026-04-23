import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import {
  getMaxAttachmentMb,
  getPublicBaseUrl,
  setMaxAttachmentMb,
  setPublicBaseUrl,
} from "@/lib/config/system";
import { withErrorBoundary } from "@/lib/http/handler";
import { adminConfigPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// GET /api/admin/config —— FR-054, FR-055
export const GET = withErrorBoundary(async () => {
  await requireAdmin();
  return NextResponse.json({
    max_attachment_mb: getMaxAttachmentMb(),
    public_base_url: getPublicBaseUrl(),
  });
});

// PATCH /api/admin/config —— FR-054, FR-055
// 前端按卡独立提交，body 只带被修改的字段；schema 保证至少有一项
export const PATCH = withErrorBoundary(async (req: NextRequest) => {
  await requireAdmin();
  const payload = adminConfigPatchSchema.parse(await req.json());
  if (payload.max_attachment_mb !== undefined) {
    setMaxAttachmentMb(payload.max_attachment_mb);
  }
  if (payload.public_base_url !== undefined) {
    setPublicBaseUrl(payload.public_base_url);
  }
  return NextResponse.json({
    max_attachment_mb: getMaxAttachmentMb(),
    public_base_url: getPublicBaseUrl(),
  });
});
