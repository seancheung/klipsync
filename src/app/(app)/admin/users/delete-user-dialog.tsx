"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserItem } from "@/lib/api/types";

export function DeleteUserDialog({
  target,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  target: AdminUserItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
  submitting: boolean;
}) {
  const open = target !== null;
  const [typed, setTyped] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setTyped("");
    onOpenChange(next);
  }

  const matches = target !== null && typed === target.username;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除此用户？</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-s-3">
            该用户的空间将被<strong className="text-text">永久删除</strong>
            （所有剪贴板 + 所有附件 + 账号本身），
            <strong className="text-text">不可撤销</strong>。
          </p>
          <div className="flex flex-col gap-[6px]">
            <Label htmlFor="delete-confirm">
              请输入用户名{" "}
              <strong className="text-text">{target?.username ?? ""}</strong>{" "}
              确认
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={target?.username ?? ""}
              autoComplete="off"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="danger-fill"
            disabled={!matches || submitting}
            onClick={() => {
              if (target && matches) onConfirm(target.id);
            }}
          >
            {submitting ? "删除中…" : "永久删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
