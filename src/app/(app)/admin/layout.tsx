import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/middleware";
import { ApiError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

// Admin 子树统一守卫：非 admin 一律 404 → 重定向到 /forbidden
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { user } = await requireUser();
    if (user.role !== "admin") redirect("/forbidden");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "MUST_RESET") redirect("/force-reset");
      redirect("/login");
    }
    throw err;
  }

  return <>{children}</>;
}
