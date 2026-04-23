import Link from "next/link";
import { ChevronLeft, Ban } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// P-008 —— FR-040、FR-032 / product.md §4.14
export default function ForbiddenPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-s-6 py-s-12">
      <div className="w-full max-w-[440px] text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
          <Ban className="h-8 w-8" />
        </div>
        <h1 className="mt-s-6 text-[22px] font-semibold tracking-[-0.015em]">
          此剪贴板不存在或无权访问
        </h1>
        <p className="mt-s-3 text-[14px] leading-[1.55] text-text-mute">
          可能是你扫到了别人账号下的二维码，也可能这条剪贴板刚刚被另一台设备删除。如果你认为这是错误，请联系管理员。
        </p>
        <div className="mt-s-6 flex justify-center">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回主工作台
          </Link>
        </div>
      </div>
    </div>
  );
}
