import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/middleware";
import { getMaxAttachmentMb, getPublicBaseUrl } from "@/lib/config/system";
import { db } from "@/lib/db/client";
import { attachments, clipboards } from "@/lib/db/schema";
import { ClipboardList } from "@/components/ClipboardList";
import { ClipboardWorkbench } from "@/components/ClipboardWorkbench";
import type { ClipboardDetail } from "@/lib/api/types";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function ClipboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { user } = await requireUser();
  const { id } = await params;

  const clip = db
    .select()
    .from(clipboards)
    .where(eq(clipboards.id, id))
    .get();
  // 非己对象 / 不存在 → 跳 P-008（不区分，避免泄露存在性）
  if (!clip || clip.userId !== user.id) redirect("/forbidden");

  const atts = db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
      sizeBytes: attachments.sizeBytes,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.clipboardId, id))
    .orderBy(asc(attachments.createdAt))
    .all();

  const detail: ClipboardDetail = {
    id: clip.id,
    text: clip.text,
    pinned_at: clip.pinnedAt,
    created_at: clip.createdAt,
    updated_at: clip.updatedAt,
    attachments: atts.map((a) => ({
      id: a.id,
      filename: a.filename,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      created_at: a.createdAt,
    })),
  };

  // FR-055：优先用 Admin 配置的公开访问基址；未设置时回退到 request host 派生
  const configured = getPublicBaseUrl();
  let origin: string;
  if (configured) {
    origin = configured;
  } else {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    origin = `${proto}://${host}`;
  }

  return (
    <>
      <ClipboardList activeId={id} />
      <ClipboardWorkbench
        key={id}
        initial={detail}
        maxMb={getMaxAttachmentMb()}
        origin={origin}
      />
    </>
  );
}
