"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, TriangleAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // digest 是 Next.js 分配给每个服务端错误的 ID，刻在服务端日志里
    console.error("[client-boundary]", error.digest, error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-s-6 py-s-12">
      <div className="w-full max-w-[440px] text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-s-6 text-[22px] font-semibold tracking-[-0.015em]">
          页面出错了
        </h1>
        <p className="mt-s-3 text-[14px] leading-[1.55] text-text-mute">
          刚才的操作触发了一个未预料的错误。刷新通常能恢复；若持续出现，请把下方错误码告知管理员。
        </p>
        {error.digest ? (
          <p className="mt-s-2 font-mono text-[12px] text-text-dim">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-s-6 flex flex-wrap justify-center gap-s-3">
          <Button variant="primary" size="lg" onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            重试
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回主页
          </Link>
        </div>
      </div>
    </div>
  );
}
