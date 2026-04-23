"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiJson } from "@/lib/api/client";
import type { AttachmentMeta } from "@/lib/api/types";
import { buttonVariants } from "@/components/ui/button";
import { formatBytes } from "@/lib/format/time";
import { cn } from "@/lib/utils";

type UploadTask = {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
  file: File;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipboardId: string;
  attachments: AttachmentMeta[];
  maxMb: number;
};

// crypto.randomUUID 仅在 secure context（HTTPS/localhost）可用，HTTP + LAN IP 场景下不存在。
// 此处仅用于本地上传任务的 React key，无需密码学安全。
function genTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extLabel(filename: string, mime: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot >= 0 && dot < filename.length - 1) {
    return filename.slice(dot + 1).toUpperCase().slice(0, 4);
  }
  const m = mime.split("/")[1];
  return (m ?? "FILE").toUpperCase().slice(0, 4);
}

export function AttachmentDrawer({
  open,
  onOpenChange,
  clipboardId,
  attachments,
  maxMb,
}: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AttachmentMeta | null>(null);

  const maxBytes = maxMb * 1024 * 1024;

  const upload = useCallback(
    (file: File) => {
      if (file.size > maxBytes) {
        toast.error(`"${file.name}" 超过 ${maxMb} MB 上限`);
        return;
      }
      const taskId = genTaskId();
      setUploads((prev) => [
        ...prev,
        { id: taskId, name: file.name, size: file.size, progress: 0, file },
      ]);

      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      xhr.open("POST", `/api/clipboards/${clipboardId}/attachments`);
      xhr.responseType = "json";
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const progress = Math.round((ev.loaded / ev.total) * 100);
        setUploads((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, progress } : t)),
        );
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploads((prev) => prev.filter((t) => t.id !== taskId));
          void qc.invalidateQueries({ queryKey: ["clipboard", clipboardId] });
          void qc.invalidateQueries({ queryKey: ["clipboards"] });
        } else {
          const body = xhr.response as
            | { error?: { code?: string; message?: string } }
            | null;
          const msg = body?.error?.message ?? `上传失败（HTTP ${xhr.status}）`;
          setUploads((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, error: msg } : t)),
          );
          toast.error(msg);
        }
      };
      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, error: "网络错误" } : t)),
        );
        toast.error("网络错误");
      };
      xhr.send(form);
    },
    [clipboardId, maxBytes, maxMb, qc],
  );

  function retry(task: UploadTask) {
    setUploads((prev) => prev.filter((t) => t.id !== task.id));
    upload(task.file);
  }

  function cancel(task: UploadTask) {
    setUploads((prev) => prev.filter((t) => t.id !== task.id));
  }

  function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    for (const f of Array.from(files)) upload(f);
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  // 全页粘贴文件：不限制 drawer 开关，已保存态任意时刻都能粘
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.files;
      if (!items || items.length === 0) return;
      e.preventDefault();
      handleFiles(items);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipboardId, maxBytes]);

  // ESC 关闭抽屉
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/api/attachments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clipboard", clipboardId] });
      void qc.invalidateQueries({ queryKey: ["clipboards"] });
      setPendingDelete(null);
      toast.success("已删除附件");
    },
    onError: (err) => {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const totalBytes = attachments.reduce((s, a) => s + a.size_bytes, 0);

  return (
    <aside
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-line bg-bg-raise shadow-pop transition-[transform,opacity] duration-200 ease-crisp md:w-[340px]",
        open
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-6 opacity-0 pointer-events-none",
        dragging && "outline outline-2 outline-accent",
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-s-3 border-b border-line px-s-6 py-s-3">
        <h3 className="flex items-center gap-s-2 text-[15px] font-semibold">
          附件
          <span className="font-mono text-[12px] font-normal text-text-dim">
            {attachments.length}
            {attachments.length > 0 ? ` · ${formatBytes(totalBytes)}` : ""}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid h-8 w-8 place-items-center rounded-md text-text-mute transition-colors hover:bg-bg-sunk hover:text-text"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-s-2">
        {attachments.length === 0 && uploads.length === 0 && (
          <div className="px-s-6 py-s-8 text-center text-[13px] text-text-dim">
            暂无附件。拖入、粘贴或点击下方按钮上传。
          </div>
        )}
        {attachments.map((a) => (
          <AttachmentRow
            key={a.id}
            att={a}
            onDownload={() => {
              window.location.href = `/api/attachments/${a.id}/download`;
            }}
            onDelete={() => setPendingDelete(a)}
          />
        ))}
        {uploads.map((u) => (
          <div
            key={u.id}
            className="relative grid grid-cols-[36px_1fr_auto] items-center gap-s-3 border-b border-line bg-peach-soft px-s-6 py-s-3"
          >
            <div className="grid h-9 w-9 place-items-center rounded-sm bg-peach font-mono text-[10px] font-semibold text-white">
              {extLabel(u.name, "").slice(0, 4)}
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-[13px] font-medium text-peach"
                title={u.name}
              >
                {u.name}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-peach">
                {u.error ? `失败 · ${u.error}` : `上传中 · ${u.progress}%`}
              </div>
            </div>
            {u.error ? (
              <button
                type="button"
                onClick={() => retry(u)}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                重试
              </button>
            ) : (
              <button
                type="button"
                onClick={() => cancel(u)}
                className="grid h-7 w-7 place-items-center rounded-md text-peach hover:bg-peach/10"
                title="移除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-peach/20">
              <div
                className="h-full bg-peach transition-[width] duration-200"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 border-t border-line px-s-6 py-s-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-s-2 rounded-lg border border-dashed border-line-strong bg-bg-sunk py-s-6 text-text-mute transition-colors hover:border-accent hover:text-accent-strong"
        >
          <FileUp className="h-5 w-5" />
          <strong className="font-head text-[13px]">
            粘贴、拖放或点击选择附件
          </strong>
          <small className="font-mono text-[11px] text-text-dim">
            单文件 ≤ {maxMb} MB · 任意类型
          </small>
        </button>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除附件？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            {pendingDelete && (
              <>
                将永久删除 <strong>{pendingDelete.filename}</strong>（
                {formatBytes(pendingDelete.size_bytes)}
                ），该操作不可撤销。
              </>
            )}
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "danger-fill" }))}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) removeMutation.mutate(pendingDelete.id);
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function AttachmentRow({
  att,
  onDownload,
  onDelete,
}: {
  att: AttachmentMeta;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group grid grid-cols-[36px_1fr_auto] items-center gap-s-3 border-b border-line px-s-6 py-s-3 transition-colors hover:bg-bg-sunk">
      <div className="grid h-9 w-9 place-items-center rounded-sm bg-bg font-mono text-[10px] font-semibold text-text-mute">
        {extLabel(att.filename, att.mime_type)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium" title={att.filename}>
          {att.filename}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-text-dim">
          {formatBytes(att.size_bytes)}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onDownload}
          className="grid h-7 w-7 place-items-center rounded-md text-text-mute hover:bg-bg-raise hover:text-text"
          title="下载"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger-soft"
          title="删除附件"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
