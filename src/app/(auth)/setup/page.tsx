import Image from "next/image";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

// P-001 —— FR-062 首次部署引导
export default async function SetupPage() {
  // 等价于 GET /api/setup：如果系统已存在 admin，禁止暴露 /setup
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();
  if (existing) redirect("/login");

  return (
    <div className="min-h-dvh bg-bg p-s-6 pb-safe-6 grid place-items-center">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-bg-raise shadow-card px-s-4 pt-s-6 pb-s-6 sm:px-s-8 sm:pt-s-8">
        <div className="mb-s-6 flex flex-col items-center gap-s-3">
          <Image
            src="/icons/icon-192.png"
            alt="KlipSync"
            width={44}
            height={44}
            className="h-11 w-11 rounded-[13px]"
            priority
          />
          <h1 className="text-[22px] text-center font-semibold tracking-[-0.015em]">
            欢迎使用 KlipSync
          </h1>
          <div className="mt-1 text-center text-[14px] text-text-mute">
            这是这台 NAS 首次启动，请创建一个管理员账号来开始使用。
          </div>
        </div>

        <div className="mb-s-6 flex gap-s-3 rounded-lg bg-info-soft px-s-4 py-s-3 text-[13px]">
          <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-info" />
          <div className="flex-1">
            <strong className="block font-semibold text-info">这是一次性的初始化步骤</strong>
            <small className="mt-[2px] block text-text-mute">
              创建后，只有该管理员账号能新增其他成员；本页之后不再可访问。
            </small>
          </div>
        </div>

        <SetupForm />
      </div>
    </div>
  );
}
