import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth/middleware";
import { db } from "@/lib/db/client";
import { clipboards } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// 主工作台入口：有最近一条就打开它，否则进空白编辑区。
export default async function WorkbenchIndexPage() {
  const { user } = await requireUser();
  const row = db
    .select({ id: clipboards.id })
    .from(clipboards)
    .where(eq(clipboards.userId, user.id))
    .orderBy(
      sql`CASE WHEN ${clipboards.pinnedAt} IS NULL THEN 1 ELSE 0 END`,
      desc(clipboards.pinnedAt),
      desc(clipboards.updatedAt),
    )
    .get();
  if (row) redirect(`/c/${row.id}`);
  redirect("/c/new");
}
