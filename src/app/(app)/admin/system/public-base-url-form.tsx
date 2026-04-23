"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiJson } from "@/lib/api/client";
import type { AdminConfigResponse } from "@/lib/api/types";
import {
  publicBaseUrlFormSchema,
  type PublicBaseUrlFormInput,
} from "@/lib/validation/schemas";

export function PublicBaseUrlForm({ initialUrl }: { initialUrl: string }) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PublicBaseUrlFormInput>({
    resolver: zodResolver(publicBaseUrlFormSchema),
    mode: "onTouched",
    defaultValues: { public_base_url: initialUrl },
  });

  async function onSubmit(values: PublicBaseUrlFormInput) {
    setSubmitError(null);
    try {
      const res = await apiJson<AdminConfigResponse>("/api/admin/config", {
        method: "PATCH",
        body: { public_base_url: values.public_base_url },
      });
      setCurrentUrl(res.public_base_url);
      toast.success("系统设置已更新");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("保存失败，请稍后重试");
      }
    }
  }

  const effective = currentUrl || "（未设置 · 自动使用当前请求的访问地址）";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="base-url">公开访问基址</Label>
        <Input
          id="base-url"
          type="url"
          placeholder="https://klipsync.example.com"
          aria-invalid={!!errors.public_base_url}
          {...register("public_base_url")}
        />
        {errors.public_base_url ? (
          <div className="font-mono text-[11px] text-danger">
            {errors.public_base_url.message}
          </div>
        ) : (
          <div className="font-mono text-[11px] text-text-dim">
            http(s):// 开头，不含末尾 /，≤ 512 字符 · 留空则自动使用当前请求地址
          </div>
        )}
      </div>

      <div className="my-s-4 flex gap-s-3 rounded-lg bg-info-soft px-s-4 py-s-3 text-[13px]">
        <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-info" />
        <div className="flex-1 text-text">
          <strong className="block font-semibold text-info">当前生效基址</strong>
          <small className="mt-[2px] block break-all text-text-mute">
            {effective}
          </small>
        </div>
      </div>

      {submitError && (
        <div className="mb-s-4 flex gap-s-3 rounded-lg bg-danger-soft px-s-4 py-s-3 text-[13px]">
          <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-danger" />
          <div className="flex-1 text-text">
            <strong className="block font-semibold text-danger">保存失败</strong>
            <small className="mt-[2px] block text-text-mute">{submitError}</small>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
