import { NextResponse, type NextRequest } from "next/server";

// 直接字面量而非 import @/lib/auth/session —— session.ts 会间接拉入 better-sqlite3 /
// @node-rs/argon2 等 Node-only 依赖，在 Edge runtime 下无法打包。保持 proxy
// 纯 Edge。这里的值必须与 lib/auth/session.ts 中的 SESSION_COOKIE_NAME 一致。
const SESSION_COOKIE_NAME = "klipsync_session";

/**
 * Edge proxy —— technical.md §7 "Middleware 分层 1"
 * （Next.js 16 起 middleware 文件约定已改名为 proxy，行为等价）
 *
 * 只做两件粗事，且不碰 SQLite：
 *   1. 未初始化 → 强制 /setup
 *   2. 已初始化、未登录、访问需鉴权路由 → /login?next=<原 URL>
 *
 * 细粒度鉴权（session 校验、must_reset、ownership）放到 Route Handler /
 * Server Component 层（Node runtime）。
 *
 * 初始化状态通过一次无鉴权的 `GET /api/setup` 获取；结果缓存在模块变量里避免
 * 每请求都打一次。一旦判定为已初始化，本进程内永不再回查（已初始化的系统
 * 不会再变回未初始化）。
 */

const PUBLIC_PATH_EXACT = new Set<string>([
  "/setup",
  "/login",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.webmanifest",
  "/sw.js",
]);

const INITIALIZED_CACHE_TTL_MS = 5_000;

type InitializedCache = { value: boolean; at: number };
let initializedCache: InitializedCache | null = null;

async function isInitialized(origin: string): Promise<boolean> {
  if (initializedCache?.value === true) return true;
  if (initializedCache && Date.now() - initializedCache.at < INITIALIZED_CACHE_TTL_MS) {
    return initializedCache.value;
  }
  try {
    const res = await fetch(`${origin}/api/setup`, { cache: "no-store" });
    if (!res.ok) {
      // 查询失败时保守按"已初始化"放行，避免误把首次访问者锁死在 /setup
      initializedCache = { value: true, at: Date.now() };
      return true;
    }
    const body = (await res.json()) as { initialized?: boolean };
    const value = body.initialized === true;
    initializedCache = { value, at: Date.now() };
    return value;
  } catch {
    initializedCache = { value: true, at: Date.now() };
    return true;
  }
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATH_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/icons/")) return true;
  // Serwist 输出的 sw 依赖 chunk，文件名带 hash
  if (pathname.startsWith("/swe-worker-")) return true;
  // 强制改密页本身也要通行，由 Server Component + requireUser({allowMustReset}) 把关
  if (pathname === "/force-reset") return true;
  return false;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const origin = req.nextUrl.origin;
  const initialized = await isInitialized(origin);

  if (!initialized) {
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (search ?? ""))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 除静态资源外都进来走一次；具体豁免由 isPublic 决定
    "/((?!_next/static|_next/image|icons|favicon.ico).*)",
  ],
};
