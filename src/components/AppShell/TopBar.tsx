"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Settings, ShieldCheck, ChevronLeft } from "lucide-react";

import { SSEStatusDot } from "@/components/AppShell/SSEStatusDot";
import { useListDrawer } from "@/lib/store/list-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { closeSSEConnection } from "@/hooks/useSSE";

type User = {
  id: string;
  username: string;
  role: "admin" | "user";
};

export function TopBar({
  user,
  onBack,
  showBack = false,
}: {
  user: User;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleListDrawer = useListDrawer((s) => s.toggle);
  const showListMenu = pathname?.startsWith("/c/") ?? false;
  const initial = user.username.slice(0, 1).toUpperCase();

  async function handleLogout() {
    closeSSEConnection();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-s-4 border-b border-line px-s-4 md:px-s-8 bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] backdrop-blur-[8px] backdrop-saturate-150">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="md:hidden grid h-8 w-8 place-items-center rounded-md text-text-mute hover:bg-bg-sunk hover:text-text"
          title="返回列表"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {showListMenu && (
        <button
          type="button"
          onClick={toggleListDrawer}
          className="grid h-8 w-8 place-items-center rounded-md text-text-mute hover:bg-bg-sunk hover:text-text md:hidden"
          title="剪贴板列表"
          aria-label="打开剪贴板列表"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      <Link href="/" className="flex items-center gap-s-3">
        <Image
          src="/icons/icon-192.png"
          alt="KlipSync"
          width={28}
          height={28}
          className="h-7 w-7 rounded-[9px]"
          priority
        />
        <div className="font-head text-[15px] font-semibold tracking-[-0.02em]">
          KlipSync
        </div>
      </Link>

      <div className="flex-1" />

      <SSEStatusDot />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-s-2 rounded-pill border border-line bg-bg-raise py-1 pl-1 pr-s-3 text-[13px] text-text transition-[border-color] duration-150 hover:border-line-strong"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-strong">
              {initial}
            </span>
            <span className="max-w-[120px] truncate">{user.username}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-text-dim">
            {user.role === "admin" ? "管理员" : "普通用户"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="gap-s-2">
              <Settings className="h-4 w-4" />
              个人设置
            </Link>
          </DropdownMenuItem>
          {user.role === "admin" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin/users" className="gap-s-2">
                  <ShieldCheck className="h-4 w-4" />
                  用户管理
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/system" className="gap-s-2">
                  <ShieldCheck className="h-4 w-4" />
                  系统设置
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void handleLogout();
            }}
            className="gap-s-2 text-danger focus:text-danger"
          >
            <LogOut className="h-4 w-4" />
            登出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
