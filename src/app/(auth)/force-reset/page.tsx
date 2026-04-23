import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/lib/auth/session";

import { ForceResetForm } from "./force-reset-form";

export const dynamic = "force-dynamic";

// P-003 —— FR-005 强制改密
export default async function ForceResetPage() {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore);
  if (!session) redirect("/login");
  // 已经不需要强制改密的用户访问此页 —— 直接送回主工作台
  if (session.user.mustReset !== 1) redirect("/");

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
            请设置新密码
          </h1>
          <div className="mt-1 text-center text-[14px] text-text-mute">
            用户 <strong className="text-text">{session.user.username}</strong>
          </div>
        </div>

        <div className="mb-s-6 flex gap-s-3 rounded-lg bg-warn-soft px-s-4 py-s-3 text-[13px]">
          <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-warn" />
          <div className="flex-1 text-text">
            <strong className="block font-semibold text-warn">
              你正在使用初始密码 / 已被管理员重置的密码
            </strong>
            <small className="mt-[2px] block text-text-mute">
              按规则必须修改后才能进入系统。如需更换账号请点下方&ldquo;登出此账号&rdquo;。
            </small>
          </div>
        </div>

        <ForceResetForm />
      </div>
    </div>
  );
}
