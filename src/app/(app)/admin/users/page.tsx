import { requireAdmin } from "@/lib/auth/middleware";

import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

// P-006 —— FR-050 ~ FR-053 用户管理
export default async function AdminUsersPage() {
  const { user: me } = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-[1100px] p-s-6 md:p-s-8">
      <UsersTable currentUserId={me.id} />
    </div>
  );
}
