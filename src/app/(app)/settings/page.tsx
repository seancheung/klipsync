import { requireUser } from "@/lib/auth/middleware";
import { Badge } from "@/components/ui/badge";

import { ChangePasswordForm } from "./change-password-form";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

// P-005 —— FR-002 / FR-003 个人设置
export default async function SettingsPage() {
  const { user } = await requireUser();
  const initial = user.username.slice(0, 1).toUpperCase();
  const createdAt = new Date(user.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const joined = `${createdAt.getFullYear()}-${pad(createdAt.getMonth() + 1)}-${pad(createdAt.getDate())}`;

  return (
    <div className="mx-auto w-full max-w-[720px] p-s-6 md:p-s-8">
      <header className="mb-s-6 flex items-start justify-between gap-s-4">
        <div>
          <h1 className="font-head text-[22px] font-semibold tracking-[-0.015em]">
            个人设置
          </h1>
          <div className="mt-1 text-[13px] text-text-mute">
            管理你的账号信息和会话
          </div>
        </div>
      </header>

      <div className="mb-s-3 font-head text-[12px] font-medium uppercase tracking-[0.04em] text-text-dim">
        账号信息
      </div>
      <div className="mb-s-6 rounded-lg border border-line bg-bg-raise shadow-card">
        <div className="flex flex-wrap items-center gap-s-4 p-s-4 sm:p-s-6">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft font-head text-[22px] font-semibold text-accent-strong">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-head text-[16px] font-semibold">
              {user.username}
            </div>
            <div className="mt-1 font-mono text-[12px] text-text-dim">
              {user.role === "admin" ? "管理员" : "普通用户"} · 自 {joined} 起使用
            </div>
          </div>
          <Badge variant={user.role === "admin" ? "pinned" : "info"}>
            {user.role === "admin" ? "管理员" : "普通用户"}
          </Badge>
        </div>
      </div>

      <div className="mb-s-3 font-head text-[12px] font-medium uppercase tracking-[0.04em] text-text-dim">
        修改密码
      </div>
      <div className="mb-s-6 rounded-lg border border-line bg-bg-raise shadow-card">
        <div className="p-s-6">
          <ChangePasswordForm />
        </div>
      </div>

      <div className="mb-s-3 font-head text-[12px] font-medium uppercase tracking-[0.04em] text-text-dim">
        会话
      </div>
      <div className="rounded-lg border border-line bg-bg-raise shadow-card">
        <div className="flex items-center justify-between gap-s-4 p-s-6">
          <div>
            <div className="font-head text-[14px] font-medium">当前会话</div>
            <div className="mt-1 font-mono text-[12px] text-text-mute">
              登出后需要重新输入用户名和密码
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
