"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forceResetSchema, type ForceResetInput } from "@/lib/validation/schemas";

type ApiErrorShape = { error?: { code?: string; message?: string } };

export function ForceResetForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForceResetInput>({
    resolver: zodResolver(forceResetSchema),
    mode: "onTouched",
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ForceResetInput) {
    setSubmitError(null);
    // 新旧相同前端先拦一次（服务端也会返 CONFLICT）
    if (values.oldPassword === values.newPassword) {
      setError("newPassword", { message: "新密码不能与旧密码相同" });
      return;
    }
    const res = await fetch("/api/auth/force-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorShape;
      const code = body.error?.code;
      if (code === "INVALID_CREDENTIALS" || code === "UNAUTHENTICATED") {
        setError("oldPassword", { message: "当前密码不正确" });
      } else if (code === "CONFLICT") {
        setError("newPassword", { message: body.error?.message ?? "新旧密码冲突" });
      } else {
        setSubmitError(body.error?.message ?? "修改失败，请稍后重试");
      }
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-s-6" noValidate>
        <div className="mb-s-4 flex flex-col gap-[6px]">
          <Label htmlFor="oldPassword">当前密码（初始密码）</Label>
          <Input
            id="oldPassword"
            type="password"
            autoComplete="current-password"
            placeholder="输入管理员给你的初始密码"
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
            placeholder="至少 8 位，不能与旧密码相同"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
          {errors.newPassword ? (
            <div className="font-mono text-[11px] text-danger">
              {errors.newPassword.message}
            </div>
          ) : (
            <div className="font-mono text-[11px] text-text-dim">
              使用字母 + 数字，推荐 12 位以上
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

        <div className="mt-s-6">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full justify-center"
          >
            {isSubmitting ? "正在设置…" : "设置新密码并继续"}
          </Button>
        </div>
      </form>

      <div className="mt-s-4 text-center text-[13px]">
        <button
          type="button"
          onClick={handleLogout}
          className="text-accent-strong hover:underline"
        >
          登出此账号
        </button>
      </div>
    </>
  );
}
