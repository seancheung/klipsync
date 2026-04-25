"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link as LinkIcon, QrCode } from "lucide-react";
import { toast } from "sonner";

import { copyText } from "@/lib/clipboard/copy";

/**
 * QR 面板 —— FR-040 / product.md §4.9
 * 悬浮按钮 + 点击展开小面板，包含当前剪贴板 URL 的 QR 码 + 复制链接按钮。
 * 在移动端触发时按钮尺寸更大，面板靠右下；桌面按钮与工具栏共处。
 */
export function QRCodePanel({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function copy() {
    const ok = await copyText(url);
    if (ok) toast.success("链接已复制");
    else toast.error("复制失败");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-7 w-7 place-items-center rounded-md text-text-mute transition-colors hover:bg-bg-sunk hover:text-text"
        title="扫码在另一设备打开"
      >
        <QrCode className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] rounded-lg border border-line bg-bg-raise p-s-4 shadow-pop">
          <div className="grid place-items-center rounded-md bg-white p-s-3">
            <QRCodeSVG value={url} size={180} level="M" includeMargin={false} />
          </div>
          <div className="mt-s-3 font-head text-[13px] font-semibold">
            扫码在另一设备打开
          </div>
          <div className="mt-s-1 text-[12px] text-text-mute">
            用系统相机扫此二维码，登录同一账号后即可编辑这条剪贴板。
          </div>
          <div
            className="mt-s-3 break-all rounded-sm bg-bg-sunk px-s-2 py-s-1 font-mono text-[11px] text-text-mute"
            title={url}
          >
            {url}
          </div>
          <button
            type="button"
            onClick={copy}
            className="mt-s-3 inline-flex w-full items-center justify-center gap-s-1 rounded-md border border-line-strong bg-bg-raise px-s-3 py-s-2 font-head text-[12px] font-medium text-text hover:bg-bg-sunk"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            复制链接
          </button>
        </div>
      )}
    </div>
  );
}
