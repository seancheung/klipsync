import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string }>;

// P-002 —— FR-001, FR-004
export default async function LoginPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const nextRaw = sp.next ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  // 已登录且不需要强制改密 → 直接进目标路径；需要强制改密的由 Edge/Server 层再兜底
  const cookieStore = await cookies();
  const session = await readSession(cookieStore);
  if (session) {
    if (session.user.mustReset === 1) redirect("/force-reset");
    redirect(next);
  }

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
            登录 KlipSync
          </h1>
          <div className="mt-1 text-center text-[14px] text-text-mute">
            家庭 NAS 上的共享剪贴板
          </div>
        </div>

        <LoginForm next={next} />

        <div className="mt-s-4 text-center text-[13px] text-text-mute">
          还没有账号？请联系管理员为你开通。
        </div>
      </div>
    </div>
  );
}
