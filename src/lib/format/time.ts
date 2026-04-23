const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 相对时间格式化 —— 贴近原型 P-004 的"刚刚/3 分钟前/昨天/2026-04-20"风格。 */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 30 * 1000) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;

  const then = new Date(ts);
  const today = new Date(now);
  const sameYear = then.getFullYear() === today.getFullYear();
  const dayOfYear = (d: Date) =>
    Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / DAY,
    );
  const diffDays = dayOfYear(today) - dayOfYear(then);
  if (sameYear && diffDays === 1) return "昨天";
  if (sameYear && diffDays < 7) return `${diffDays} 天前`;

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = then.getFullYear();
  const mm = pad(then.getMonth() + 1);
  const dd = pad(then.getDate());
  return sameYear ? `${mm}-${dd}` : `${yyyy}-${mm}-${dd}`;
}

/** HH:mm，用于列表右上角时间戳（与原型一致）。 */
export function formatTimeHM(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 字节格式化 —— 附件大小展示 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  if (n < 1024 * 1024 * 1024)
    return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
