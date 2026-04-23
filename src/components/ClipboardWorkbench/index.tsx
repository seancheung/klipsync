"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Check,
  Copy,
  Eraser,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { AttachmentDrawer } from "@/components/AttachmentDrawer";
import { QRCodePanel } from "@/components/QRCodePanel";
import { buttonVariants } from "@/components/ui/button";
import { useClipboardDetailSync } from "@/hooks/useClipboardSync";
import { ApiClientError, apiGet, apiJson } from "@/lib/api/client";
import type { ClipboardDetail } from "@/lib/api/types";
import { useActiveClipboard } from "@/lib/store/active-clipboard";
import { cn } from "@/lib/utils";

type SaveState = "draft" | "saving" | "saved" | "error";

type Props = {
  initial: ClipboardDetail | null;
  maxMb: number;
  origin: string;
};

const DEBOUNCE_MS = 300;

/**
 * 草稿态 (clipboardId=null) 与已保存态共用同一 textarea DOM，
 * 从草稿切到已保存通过 history.replaceState 而非路由跳转，
 * 焦点与光标全程保持（fs-dev 方案 D）。
 * 布局对齐 prototype/P-004-workbench.html：
 * editor-col (toolbar + body with bordered textarea) + overlay 附件抽屉。
 */
export function ClipboardWorkbench({ initial, maxMb, origin }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const setActiveId = useActiveClipboard((s) => s.setId);

  const [clipboardId, setClipboardId] = useState<string | null>(initial?.id ?? null);
  const [text, setText] = useState(initial?.text ?? "");
  const [lastSavedText, setLastSavedText] = useState(initial?.text ?? "");
  const [pinnedAt, setPinnedAt] = useState<number | null>(initial?.pinned_at ?? null);
  const [saveState, setSaveState] = useState<SaveState>(initial ? "saved" : "draft");
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingRef = useRef(false);
  // IME composition 期间（中文 / 日文 / 韩文 输入法选词未完成）不触发保存，
  // 否则拼音中间态会被当成正文 PATCH 到服务端。
  const composingRef = useRef(false);

  useEffect(() => {
    setActiveId(clipboardId);
    return () => setActiveId(null);
  }, [clipboardId, setActiveId]);

  const detailQuery = useQuery({
    queryKey: ["clipboard", clipboardId ?? "__draft__"],
    queryFn: () => apiGet<ClipboardDetail>(`/api/clipboards/${clipboardId}`),
    initialData: initial ?? undefined,
    enabled: clipboardId !== null,
    retry: false,
  });

  useClipboardDetailSync(clipboardId ?? "");

  const deletedExternally =
    clipboardId !== null &&
    detailQuery.error instanceof ApiClientError &&
    detailQuery.error.code === "NOT_FOUND";

  const detail = detailQuery.data ?? null;
  const attachments = detail?.attachments ?? [];

  const [prevDetailText, setPrevDetailText] = useState<string | null>(
    detail?.text ?? null,
  );
  if (detail && detail.text !== prevDetailText) {
    setPrevDetailText(detail.text);
    if (text === lastSavedText) {
      setLastSavedText(detail.text);
      setText(detail.text);
    }
  }
  const [prevDetailPinned, setPrevDetailPinned] = useState<number | null>(
    detail?.pinned_at ?? null,
  );
  if (detail && detail.pinned_at !== prevDetailPinned) {
    setPrevDetailPinned(detail.pinned_at);
    setPinnedAt(detail.pinned_at);
  }

  const persistText = useCallback(
    async (value: string, id: string) => {
      setSaveState("saving");
      try {
        await apiJson(`/api/clipboards/${id}`, {
          method: "PATCH",
          body: { text: value },
        });
        setLastSavedText(value);
        setSaveState("saved");
        void qc.invalidateQueries({ queryKey: ["clipboards"] });
      } catch (err) {
        setSaveState("error");
        toast.error("保存失败", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [qc],
  );

  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  });

  const createClipboard = useCallback(
    async (initialText: string, pendingFiles: File[] = []): Promise<string | null> => {
      if (creatingRef.current) return null;
      creatingRef.current = true;
      setSaveState("saving");
      try {
        const created = await apiJson<ClipboardDetail>("/api/clipboards", {
          method: "POST",
          body: { text: initialText },
        });
        setClipboardId(created.id);
        setLastSavedText(initialText);
        qc.setQueryData(["clipboard", created.id], created);
        void qc.invalidateQueries({ queryKey: ["clipboards"] });
        setActiveId(created.id);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/c/${created.id}`);
        }
        for (const f of pendingFiles) {
          if (f.size > maxMb * 1024 * 1024) {
            toast.error(`"${f.name}" 超过 ${maxMb} MB 上限`);
            continue;
          }
          const form = new FormData();
          form.append("file", f);
          try {
            await fetch(`/api/clipboards/${created.id}/attachments`, {
              method: "POST",
              body: form,
            });
          } catch {
            toast.error("附件上传失败");
          }
        }
        if (pendingFiles.length > 0) {
          void qc.invalidateQueries({ queryKey: ["clipboard", created.id] });
          setDrawerOpen(true);
        }
        const latest = textRef.current;
        if (latest !== initialText) {
          void persistText(latest, created.id);
        } else {
          setSaveState("saved");
        }
        return created.id;
      } catch (err) {
        setSaveState("error");
        toast.error("创建失败", {
          description: err instanceof Error ? err.message : String(err),
        });
        return null;
      } finally {
        creatingRef.current = false;
      }
    },
    [maxMb, persistText, qc, setActiveId],
  );

  const scheduleSave = useCallback(
    (value: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (clipboardId !== null) {
          if (value !== lastSavedText) void persistText(value, clipboardId);
        } else if (value.trim().length > 0) {
          void createClipboard(value);
        }
      }, DEBOUNCE_MS);
    },
    [clipboardId, createClipboard, lastSavedText, persistText],
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setText(value);
    if (composingRef.current) return;
    if (clipboardId === null) {
      setSaveState(value.trim().length > 0 ? "saving" : "draft");
    } else {
      setSaveState(value === lastSavedText ? "saved" : "saving");
    }
    scheduleSave(value);
  }

  function handleCompositionStart() {
    composingRef.current = true;
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLTextAreaElement>) {
    composingRef.current = false;
    // compositionend 后浏览器事件顺序不一致（Chrome: end→change, Safari: change→end）。
    // 这里用 currentTarget.value 兜底，确保选词结果被 schedule。
    const value = e.currentTarget.value;
    if (clipboardId === null) {
      setSaveState(value.trim().length > 0 ? "saving" : "draft");
    } else {
      setSaveState(value === lastSavedText ? "saved" : "saving");
    }
    scheduleSave(value);
  }

  const snapRef = useRef({ text, lastSavedText, clipboardId, persistText });
  useEffect(() => {
    snapRef.current = { text, lastSavedText, clipboardId, persistText };
  });
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const snap = snapRef.current;
      if (snap.clipboardId !== null && snap.text !== snap.lastSavedText) {
        void snap.persistText(snap.text, snap.clipboardId);
      }
    };
  }, []);

  // 草稿态：全局 paste 捕获文件 → 创建后合并上传（已保存态由 AttachmentDrawer 接管）
  useEffect(() => {
    if (clipboardId !== null) return;
    function onPaste(e: ClipboardEvent) {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      void createClipboard(textRef.current, Array.from(files));
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [clipboardId, createClipboard]);

  function onDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    if (clipboardId !== null) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    void createClipboard(textRef.current, Array.from(files));
  }

  const pinMutation = useMutation({
    mutationFn: async (nextPinned: boolean) => {
      if (clipboardId === null) throw new Error("not saved");
      await apiJson(`/api/clipboards/${clipboardId}`, {
        method: "PATCH",
        body: { pinned: nextPinned },
      });
      return nextPinned;
    },
    onMutate: (nextPinned) => {
      const prev = pinnedAt;
      setPinnedAt(nextPinned ? Date.now() : null);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx) setPinnedAt(ctx.prev);
      toast.error("操作失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clipboards"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (clipboardId === null) throw new Error("not saved");
      await apiJson(`/api/clipboards/${clipboardId}`, {
        method: "PATCH",
        body: { clear: true },
      });
    },
    onSuccess: () => {
      setText("");
      setLastSavedText("");
      setSaveState("saved");
      if (clipboardId !== null) {
        void qc.invalidateQueries({ queryKey: ["clipboards"] });
        void qc.invalidateQueries({ queryKey: ["clipboard", clipboardId] });
      }
      setClearOpen(false);
      toast.success("已清空");
    },
    onError: (err) => {
      toast.error("清空失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (clipboardId === null) throw new Error("not saved");
      await apiJson(`/api/clipboards/${clipboardId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clipboards"] });
      setDeleteOpen(false);
      toast.success("已删除");
      router.push("/");
    },
    onError: (err) => {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  }

  const isDraft = clipboardId === null;
  const pinned = pinnedAt !== null;
  const url = clipboardId ? `${origin}/c/${clipboardId}` : "";
  const attachmentCount = attachments.length;

  if (deletedExternally) {
    // 对齐原型 P-008 .status-page：大图标 + 主文案 + 副文案 + 返回按钮
    return (
      <main className="relative flex min-w-0 flex-1 flex-col items-center justify-center bg-bg-raise px-s-4 text-center md:px-s-8">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-xl bg-danger-soft text-danger">
          <Trash2 className="h-8 w-8" />
        </div>
        <h1 className="mt-s-4 text-[24px] font-semibold tracking-[-0.015em]">
          此剪贴板已被删除
        </h1>
        <div className="mt-s-2 max-w-[420px] text-[14px] text-text-mute">
          这条剪贴板已由其他设备删除。
        </div>
        <div className="mt-s-6">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-raise"
      onDragOver={isDraft ? (e) => e.preventDefault() : undefined}
      onDrop={isDraft ? onDrop : undefined}
    >
      {/* Toolbar —— <900px 按钮收敛为仅图标（对齐 prototype/styles.css 的 @media 900） */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-line bg-bg-raise px-s-3 py-s-2 md:gap-s-2 md:px-s-6 md:py-s-3">
        <div className="flex flex-wrap items-center gap-0.5 md:gap-s-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isDraft || text.length === 0}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            title="复制文本"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden md:inline">复制文本</span>
          </button>
          <button
            type="button"
            onClick={() => pinMutation.mutate(!pinned)}
            disabled={isDraft || pinMutation.isPending}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            title={pinned ? "取消置顶" : "置顶"}
          >
            {pinned ? (
              <Pin className="h-3.5 w-3.5 text-accent" fill="currentColor" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">{pinned ? "已置顶" : "置顶"}</span>
          </button>
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={isDraft}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            title="清空当前剪贴板（保留 ID）"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden md:inline">清空</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={isDraft}
            className={cn(buttonVariants({ variant: "danger", size: "sm" }))}
            title="删除整条剪贴板"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">删除</span>
          </button>
        </div>
        <div className="flex items-center gap-0.5 md:gap-s-2">
          <SaveStatusIcon state={saveState} />
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            disabled={isDraft}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              drawerOpen && !isDraft && "bg-accent-soft text-accent-strong",
            )}
            title="查看附件"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden md:inline">附件</span>
            <span
              className={cn(
                "inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-pill px-s-2 font-mono text-[10px] font-semibold leading-none md:ml-1",
                drawerOpen && !isDraft
                  ? "bg-accent text-white dark:text-[#0F0F14]"
                  : "bg-accent-soft text-accent-strong",
              )}
            >
              {attachmentCount}
            </span>
          </button>
          {/* QR 仅桌面显示：扫码是"桌面 → 手机"的单向场景，手机上没必要看自己的二维码 */}
          {!isDraft && (
            <div className="hidden md:block">
              <QRCodePanel url={url} />
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      <div className="flex min-h-0 flex-1 flex-col gap-s-3 px-s-3 py-s-3 md:px-s-6 md:py-s-4">
        <textarea
          autoFocus
          spellCheck={false}
          value={text}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={
            isDraft
              ? "输入文本、粘贴或拖入附件即可创建一条新剪贴板，并同步到其他登录设备。"
              : "在这里输入或粘贴内容，将自动保存并实时同步到其他登录设备。"
          }
          className="min-h-[240px] flex-1 resize-none rounded-lg border border-line-strong bg-bg-raise px-s-4 py-s-4 font-body text-[15px] leading-[1.65] text-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-dim focus:border-accent focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
        />
      </div>

      {/* Attachment drawer 仅在已保存态生效 */}
      {!isDraft && (
        <AttachmentDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          clipboardId={clipboardId}
          attachments={attachments}
          maxMb={maxMb}
        />
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空此剪贴板？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            文本和所有附件将被删除，<strong>剪贴板本身保留</strong>
            ，ID 不变，其他设备会秒级同步这次清空。该操作不可撤销。
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "danger-fill" }))}
              onClick={(e) => {
                e.preventDefault();
                clearMutation.mutate();
              }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? "清空中…" : "确认清空"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除此剪贴板？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            该剪贴板的文本、所有附件、以及此 URL 本身都会被永久删除；正在另一端打开它的用户会看到「此剪贴板已被删除」提示。该操作
            <strong>不可撤销</strong>。
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "danger-fill" }))}
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

/**
 * 保存状态圆形图标 —— 对齐原型 .status-icon。
 * confirmed（绿勾）/ progress（琥珀转圈）/ danger（红警告）/ 草稿态显示灰点。
 */
function SaveStatusIcon({ state }: { state: SaveState }) {
  if (state === "draft") {
    return (
      <span
        className="grid h-[22px] w-[22px] place-items-center rounded-full bg-bg-sunk text-text-dim"
        title="未保存"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span
        className="grid h-[22px] w-[22px] place-items-center rounded-full bg-warn-soft text-warn"
        title="保存中"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        className="grid h-[22px] w-[22px] place-items-center rounded-full bg-danger-soft text-danger"
        title="保存失败"
      >
        <TriangleAlert className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      className="grid h-[22px] w-[22px] place-items-center rounded-full bg-success-soft text-success"
      title="已保存"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}
