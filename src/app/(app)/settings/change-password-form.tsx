"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/schemas";

type ApiErrorShape = { error?: { code?: string; message?: string } };

export function ChangePasswordForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setSubmitError(null);
    if (values.oldPassword === values.newPassword) {
      setError("newPassword", { message: "新密码不能与旧密码相同" });
      return;
    }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorShape;
      const code = body.error?.code;
      if (code === "INVALID_CREDENTIALS") {
        setError("oldPassword", { message: "当前密码不正确" });
      } else if (code === "CONFLICT") {
        setError("newPassword", {
          message: body.error?.message ?? "新旧密码冲突",
        });
      } else {
        setSubmitError(body.error?.message ?? "修改失败，请稍后重试");
      }
      return;
    }
    reset({ oldPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("密码已更新");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="oldPassword">当前密码</Label>
        <Input
          id="oldPassword"
          type="password"
          autoComplete="current-password"
          placeholder="输入当前密码"
          aria-invalid={!!errors.oldPassword}
          {...register("oldPassword")}
        />
        {errors.oldPassword && (
          <div className="font-mono text-[11px] text-danger">
            {errors.oldPassword.message}
          </div>
        )}
      </div>

      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="newPassword">新密码</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位"
          aria-invalid={!!errors.newPassword}
          {...register("newPassword")}
        />
        {errors.newPassword ? (
          <div className="font-mono text-[11px] text-danger">
            {errors.newPassword.message}
          </div>
        ) : (
          <div className="font-mono text-[11px] text-text-dim">
            不能与旧密码相同
          </div>
        )}
      </div>

      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="confirmPassword">确认新密码</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="再输一次"
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
        <div className="mb-s-4 flex gap-s-3 rounded-lg bg-danger-soft px-s-4 py-s-3 text-[13px]">
          <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-danger" />
          <div className="flex-1 text-text">
            <strong className="block font-semibold text-danger">修改失败</strong>
            <small className="mt-[2px] block text-text-mute">{submitError}</small>
          </div>
        </div>
      )}

      <div className="mt-s-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "更新中…" : "更新密码"}
        </Button>
      </div>
    </form>
  );
}
