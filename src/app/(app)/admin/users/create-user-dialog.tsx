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
import {
  adminCreateUserSchema,
  type AdminCreateUserInput,
  passwordSchema,
} from "@/lib/validation/schemas";

const formSchema = adminCreateUserSchema
  .extend({ confirmPassword: passwordSchema })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });
type FormInput = z.infer<typeof formSchema>;

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({ username: "", password: "", confirmPassword: "" });
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: FormInput) {
    setSubmitError(null);
    try {
      const payload: AdminCreateUserInput = {
        username: values.username,
        password: values.password,
      };
      await apiJson("/api/admin/users", { method: "POST", body: payload });
      toast.success("用户已创建");
      onCreated();
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "CONFLICT") {
          setError("username", { message: err.message });
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError("创建失败，请稍后重试");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增家庭成员</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            <p className="mb-s-3">
              该用户首次登录时会被强制要求修改初始密码。
            </p>
            <div className="mb-s-4 flex flex-col gap-[6px]">
              <Label htmlFor="create-username">用户名</Label>
              <Input
                id="create-username"
                placeholder="3–32 字符"
                autoComplete="off"
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
              <Label htmlFor="create-password">初始密码</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="至少 8 位"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password ? (
                <div className="font-mono text-[11px] text-danger">
                  {errors.password.message}
                </div>
              ) : (
                <div className="font-mono text-[11px] text-text-dim">
                  建议使用一次性随机密码，用户登录后会被强制修改
                </div>
              )}
            </div>
            <div className="mb-s-2 flex flex-col gap-[6px]">
              <Label htmlFor="create-confirm">确认密码</Label>
              <Input
                id="create-confirm"
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
              {isSubmitting ? "创建中…" : "创建用户"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
