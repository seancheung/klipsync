"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
import { ApiClientError, apiJson } from "@/lib/api/client";
import type { AdminUserItem } from "@/lib/api/types";
import { passwordSchema } from "@/lib/validation/schemas";

const formSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });
type FormInput = z.infer<typeof formSchema>;

export function ResetPasswordDialog({
  target,
  onOpenChange,
}: {
  target: AdminUserItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = target !== null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({ password: "", confirmPassword: "" });
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: FormInput) {
    if (!target) return;
    setSubmitError(null);
    try {
      await apiJson(`/api/admin/users/${target.id}/reset-password`, {
        method: "POST",
        body: { password: values.password },
      });
      toast.success(`已重置 ${target.username} 的密码`);
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("重置失败，请稍后重试");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置 {target?.username ?? ""} 的密码</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            <p className="mb-s-3">
              重置后该用户的所有会话会被立即吊销，下次登录需要使用你设置的新初始密码，
              并被强制要求改密。
            </p>
            <div className="mb-s-4 flex flex-col gap-[6px]">
              <Label htmlFor="reset-password">新初始密码</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="至少 8 位"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <div className="font-mono text-[11px] text-danger">
                  {errors.password.message}
                </div>
              )}
            </div>
            <div className="mb-s-2 flex flex-col gap-[6px]">
              <Label htmlFor="reset-confirm">确认密码</Label>
              <Input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <div className="font-mono text-[11px] text-danger">
                  {errors.confirmPassword.message}
                </div>
              )}
            </div>
            {submitError && (
              <div className="mt-s-3 flex gap-s-3 rounded-lg bg-danger-soft px-s-3 py-s-2 text-[12px]">
                <span className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full bg-danger" />
                <div className="text-text-mute">{submitError}</div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "重置中…" : "重置密码"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
