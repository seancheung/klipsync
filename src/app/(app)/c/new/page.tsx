import { headers } from "next/headers";

import { ClipboardList } from "@/components/ClipboardList";
import { ClipboardWorkbench } from "@/components/ClipboardWorkbench";
import { getMaxAttachmentMb, getPublicBaseUrl } from "@/lib/config/system";
import { requireUser } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

// P-004 空白编辑区 —— FR-014 / FR-015
export default async function NewClipboardPage() {
  await requireUser();
  const origin = await resolveOrigin();
  return (
    <>
      <ClipboardList activeId={null} />
      <ClipboardWorkbench initial={null} maxMb={getMaxAttachmentMb()} origin={origin} />
    </>
  );
}

// FR-055：优先用 Admin 配置的公开访问基址；未设置时回退到 request host 派生
async function resolveOrigin(): Promise<string> {
  const configured = getPublicBaseUrl();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
