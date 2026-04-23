"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiJson, ApiClientError } from "@/lib/api/client";
import type { AdminUserItem, AdminUserListResponse } from "@/lib/api/types";
import { formatBytes, formatRelative } from "@/lib/format/time";

import { CreateUserDialog } from "./create-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

const USERS_QUERY_KEY = ["admin", "users"] as const;

export function UsersTable({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => apiGet<AdminUserListResponse>("/api/admin/users"),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<{ id: string; deleted: boolean }>(`/api/admin/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("用户已删除");
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("删除失败");
      }
    },
  });

  const items = data?.items ?? [];

  return (
    <>
      <header className="mb-s-6 flex flex-wrap items-start justify-between gap-s-4">
        <div>
          <h1 className="font-head text-[22px] font-semibold tracking-[-0.015em]">
            用户管理
          </h1>
          <div className="mt-1 text-[13px] text-text-mute">
            管理家庭成员的账号生命周期 · 无法查看任何用户的剪贴板内容
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-[14px] w-[14px]" />
          新增用户
        </Button>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line bg-bg-raise shadow-card">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="bg-bg-sunk text-[11px] uppercase tracking-[0.04em] text-text-dim">
              <th className="px-s-4 py-s-3 text-left font-head font-medium">用户</th>
              <th className="px-s-4 py-s-3 text-left font-head font-medium">状态</th>
              <th className="hidden px-s-4 py-s-3 text-right font-head font-medium sm:table-cell">
                剪贴板数
              </th>
              <th className="hidden px-s-4 py-s-3 text-right font-head font-medium sm:table-cell">
                存储占用
              </th>
              <th className="hidden px-s-4 py-s-3 text-left font-head font-medium md:table-cell">
                创建时间
              </th>
              <th className="px-s-4 py-s-3 text-right font-head font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-s-4 py-s-8 text-center text-text-dim"
                >
                  加载中…
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-s-4 py-s-8 text-center text-danger"
                >
                  列表加载失败
                </td>
              </tr>
            )}
            {!isLoading && !error && items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-s-4 py-s-8 text-center text-text-dim"
                >
                  暂无用户
                </td>
              </tr>
            )}
            {items.map((u) => {
              const isSelf = u.id === currentUserId;
              const initial = u.username.slice(0, 1).toUpperCase();
              return (
                <tr
                  key={u.id}
                  className="border-t border-line [&>td]:border-t [&>td]:border-line"
                >
                  <td className="px-s-4 py-s-3">
                    <div className="flex items-center gap-s-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft font-head text-[13px] font-semibold text-accent-strong">
                        {initial}
                      </span>
                      <div>
                        <strong className="font-head font-medium">
                          {u.username}
                        </strong>
                        {isSelf && (
                          <div className="font-mono text-[11px] text-text-dim">
                            self
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-s-4 py-s-3">
                    {u.role === "admin" ? (
                      <Badge variant="pinned">管理员</Badge>
                    ) : u.must_reset ? (
                      <Badge variant="progress">待改密</Badge>
                    ) : (
                      <Badge variant="confirmed">活跃</Badge>
                    )}
                  </td>
                  <td className="hidden px-s-4 py-s-3 text-right font-mono sm:table-cell">
                    {u.clipboard_count}
                  </td>
                  <td className="hidden px-s-4 py-s-3 text-right font-mono sm:table-cell">
                    {u.storage_bytes > 0 ? formatBytes(u.storage_bytes) : "—"}
                  </td>
                  <td className="hidden px-s-4 py-s-3 font-mono text-text-mute md:table-cell">
                    {formatRelative(u.created_at)}
                  </td>
                  <td className="px-s-4 py-s-3 text-right">
                    {isSelf ? (
                      <span className="text-[12px] text-text-dim">（自己）</span>
                    ) : (
                      <div className="flex justify-end gap-s-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(u)}
                        >
                          重置密码
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(u)}
                        >
                          删除
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-s-6 flex gap-s-3 rounded-lg bg-info-soft px-s-4 py-s-3 text-[13px]">
        <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-info" />
        <div className="flex-1 text-text">
          <strong className="block font-semibold text-info">
            为什么看不到剪贴板的内容？
          </strong>
          <small className="mt-[2px] block text-text-mute">
            按设计约束，管理员只能管理账号生命周期和查看存储统计，
            <strong>无法查看任何用户的剪贴板内容或附件</strong>。
          </small>
        </div>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        }}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      />

      <DeleteUserDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={(id) => deleteMutation.mutate(id)}
        submitting={deleteMutation.isPending}
      />
    </>
  );
}
