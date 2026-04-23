"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";

type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    details?: { retryAfterSec?: number };
  };
};

// 凭据错误统一文案（§4.2 / §7 —— 不泄露是用户名还是密码错）
const GENERIC_CREDENTIAL_MESSAGE = "用户名或密码错误";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { username: "", password: "", remember: true },
  });

  useEffect(() => {
    if (lockSecondsLeft <= 0) return;
    const id = setInterval(() => {
      setLockSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [lockSecondsLeft]);

  async function onSubmit(values: LoginInput) {
    if (lockSecondsLeft > 0) return;
    setSubmitError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorShape;
      if (res.status === 429) {
        const retry = Number(body.error?.details?.retryAfterSec ?? 60);
        setLockSecondsLeft(Number.isFinite(retry) && retry > 0 ? retry : 60);
      }
      setSubmitError(GENERIC_CREDENTIAL_MESSAGE);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { must_reset?: boolean };
    if (body.must_reset) {
      router.replace("/force-reset");
      router.refresh();
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const buttonDisabled = isSubmitting || lockSecondsLeft > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-s-6" noValidate>
      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="输入用户名"
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
          autoComplete="current-password"
          placeholder="输入密码"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <div className="font-mono text-[11px] text-danger">
            {errors.password.message}
          </div>
        )}
      </div>

      <div className="mt-s-4 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-[13px] text-text-mute cursor-pointer">
          <input
            type="checkbox"
            className="h-[15px] w-[15px] accent-accent"
            {...register("remember")}
          />
          记住我（长期 Cookie）
        </label>
      </div>

      {submitError && (
        <div className="mt-s-4 flex gap-s-3 rounded-lg bg-danger-soft px-s-4 py-s-3 text-[13px]">
          <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-danger" />
          <div className="flex-1 text-text">
            <strong className="block font-semibold text-danger">登录失败</strong>
            <small className="mt-[2px] block text-text-mute">
              {submitError}
              {lockSecondsLeft > 0 && ` · 请 ${lockSecondsLeft}s 后重试`}
            </small>
          </div>
        </div>
      )}

      <div className="mt-s-6">
        <Button
          type="submit"
          size="lg"
          disabled={buttonDisabled}
          className="w-full justify-center"
        >
          {lockSecondsLeft > 0
            ? `请等待 ${lockSecondsLeft}s`
            : isSubmitting
              ? "登录中…"
              : "登录"}
        </Button>
      </div>
    </form>
  );
}
