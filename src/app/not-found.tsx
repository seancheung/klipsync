import Link from "next/link";
import { ChevronLeft, FileQuestion } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-s-6 py-s-12">
      <div className="w-full max-w-[440px] text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="mt-s-6 text-[22px] font-semibold tracking-[-0.015em]">
          页面不存在
        </h1>
        <p className="mt-s-3 text-[14px] leading-[1.55] text-text-mute">
          链接可能已失效，或者这个地址从未存在。回到主页重新开始即可。
        </p>
        <div className="mt-s-6 flex justify-center">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回主页
          </Link>
        </div>
      </div>
    </div>
  );
}
