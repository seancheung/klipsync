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
  attachmentLimitFormSchema,
  type AttachmentLimitFormInput,
} from "@/lib/validation/schemas";

export function AttachmentLimitForm({ initialMb }: { initialMb: number }) {
  const [currentMb, setCurrentMb] = useState(initialMb);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AttachmentLimitFormInput>({
    resolver: zodResolver(attachmentLimitFormSchema),
    mode: "onTouched",
    defaultValues: { max_attachment_mb: initialMb },
  });

  async function onSubmit(values: AttachmentLimitFormInput) {
    setSubmitError(null);
    try {
      const res = await apiJson<AdminConfigResponse>("/api/admin/config", {
        method: "PATCH",
        body: values,
      });
      setCurrentMb(res.max_attachment_mb);
      toast.success("系统设置已更新");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("保存失败，请稍后重试");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-s-4 flex flex-col gap-[6px]">
        <Label htmlFor="max-mb">单文件大小上限</Label>
        <div className="flex items-stretch gap-s-3">
          <Input
            id="max-mb"
            type="number"
            min={1}
            max={1024}
            step={1}
            className="max-w-[180px]"
            aria-invalid={!!errors.max_attachment_mb}
            {...register("max_attachment_mb", { valueAsNumber: true })}
          />
          <div className="flex items-center font-mono text-[13px] text-text-mute">
            MB
          </div>
        </div>
        {errors.max_attachment_mb ? (
          <div className="font-mono text-[11px] text-danger">
            {errors.max_attachment_mb.message}
          </div>
        ) : (
          <div className="font-mono text-[11px] text-text-dim">
            1–1024 · 新上限对此后上传生效，历史附件不受影响
          </div>
        )}
      </div>

      <div className="my-s-4 flex gap-s-3 rounded-lg bg-info-soft px-s-4 py-s-3 text-[13px]">
        <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-info" />
        <div className="flex-1 text-text">
          <strong className="block font-semibold text-info">
            当前有效上限：{currentMb} MB
          </strong>
          <small className="mt-[2px] block text-text-mute">
            超过上限的文件会在选择 / 拖放阶段被前置拒绝，不进入上传队列。
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
