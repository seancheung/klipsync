/**
 * 写文本到系统剪贴板 —— 优先用 Clipboard API，HTTP / 旧浏览器降级到 execCommand。
 *
 * navigator.clipboard 仅在 secure context（HTTPS / localhost）可用。
 * 局域网用 HTTP 部署时会拒绝调用，因此需要 textarea + execCommand('copy') 兜底。
 */
export async function copyText(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 某些浏览器即使在 secure context 也可能因权限拒绝，继续走降级。
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
