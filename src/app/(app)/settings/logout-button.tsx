"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { closeSSEConnection } from "@/hooks/useSSE";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    closeSSEConnection();
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="danger-fill" size="sm">
          <LogOut className="h-[14px] w-[14px]" />
          登出
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认登出？</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogBody>
          登出后需要重新输入用户名和密码。&ldquo;记住我&rdquo; cookie 也会被清除。
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              void handleLogout();
            }}
            className="bg-danger text-white hover:bg-[color-mix(in_srgb,var(--c-danger)_85%,#000)]"
          >
            {submitting ? "登出中…" : "确认登出"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
