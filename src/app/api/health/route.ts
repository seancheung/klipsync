import { NextResponse } from "next/server";

import { getSqlite } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();

/**
 * 健康检查 —— Docker healthcheck 用；不鉴权。
 *
 * 任何一步失败都返回 503，让 compose 把不健康容器标注出来。
 */
export async function GET() {
  try {
    const sqlite = getSqlite();
    const userVersion = sqlite.pragma("user_version", { simple: true }) as number;
    return NextResponse.json({
      ok: true,
      db: userVersion,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
