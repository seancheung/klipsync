/**
 * Next.js 启动钩子 —— 仅 Node runtime 加载，避免 edge middleware 下拉入 SQLite。
 * 详见 https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * 注意：必须把 import 写在 `if (NEXT_RUNTIME === 'nodejs')` 块内（而非 early-return 后），
 * 这样 webpack 在为 edge bundle 做 dead-code 消除时才能整段剥离 SQLite 相关模块。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ startAttachmentGc }, { startSessionCleanup }] = await Promise.all([
      import("@/lib/storage/gc"),
      import("@/lib/auth/session"),
    ]);

    startSessionCleanup();
    startAttachmentGc();
  }
}
