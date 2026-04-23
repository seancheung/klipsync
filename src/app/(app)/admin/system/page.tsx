import { requireAdmin } from "@/lib/auth/middleware";
import { getMaxAttachmentMb, getPublicBaseUrl } from "@/lib/config/system";

import { AttachmentLimitForm } from "./attachment-limit-form";
import { PublicBaseUrlForm } from "./public-base-url-form";

export const dynamic = "force-dynamic";

// P-007 —— FR-054 附件大小上限 / FR-055 公开访问基址
export default async function AdminSystemPage() {
  await requireAdmin();
  const currentMb = getMaxAttachmentMb();
  const currentUrl = getPublicBaseUrl();

  return (
    <div className="mx-auto w-full max-w-[720px] p-s-6 md:p-s-8">
      <header className="mb-s-6">
        <h1 className="font-head text-[22px] font-semibold tracking-[-0.015em]">
          系统设置
        </h1>
        <div className="mt-1 text-[13px] text-text-mute">
          全局系统参数配置
        </div>
      </header>

      <div className="mb-s-3 font-head text-[12px] font-medium uppercase tracking-[0.04em] text-text-dim">
        上传限制
      </div>
      <div className="rounded-lg border border-line bg-bg-raise shadow-card">
        <div className="p-s-6">
          <AttachmentLimitForm initialMb={currentMb} />
        </div>
      </div>

      <div className="mb-s-3 mt-s-8 font-head text-[12px] font-medium uppercase tracking-[0.04em] text-text-dim">
        公开访问
      </div>
      <div className="rounded-lg border border-line bg-bg-raise shadow-card">
        <div className="p-s-6">
          <PublicBaseUrlForm initialUrl={currentUrl} />
        </div>
      </div>
    </div>
  );
}
