"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupSchema, type SetupInput } from "@/lib/validation/schemas";

type ApiErrorShape = {
  error?: { code?: string; message?: string };
};

export function SetupForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    mode: "onTouched",
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SetupInput) {
    setSubmitError(null);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorShape;
      setSubmitError(body.error?.message ?? "创建失败，请稍后重试");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-s-6" noValidate>
      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="username">管理员用户名</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="3–32 字符 · 字母数字下划线"
          aria-invalid={!!errors.username}
          {...register("username")}
        />
        {errors.username && (
          <div className="font-mono text-[11px] text-danger">
            {errors.username.message}
          </div>
        )}
      </div>

      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <div className="font-mono text-[11px] text-danger">
            {errors.password.message}
          </div>
        ) : (
          <div className="font-mono text-[11px] text-text-dim">
            建议：字母 + 数字 + 符号组合，≥ 12 位更安全
          </div>
        )}
      </div>

      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="confirmPassword">确认密码</Label>
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
            <strong className="block font-semibold text-danger">创建失败</strong>
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
          {isSubmitting ? "正在创建…" : "创建管理员并进入系统"}
        </Button>
      </div>
    </form>
  );
}
