import { redirect } from "next/navigation";

import { TopBar } from "@/components/AppShell/TopBar";
import { SSEProvider } from "@/components/AppShell/SSEProvider";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireUser } from "@/lib/auth/middleware";
import { ApiError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userBasic: { id: string; username: string; role: "admin" | "user" };
  try {
    const { user } = await requireUser();
    userBasic = {
      id: user.id,
      username: user.username,
      role: user.role as "admin" | "user",
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "MUST_RESET") redirect("/force-reset");
      redirect("/login");
    }
    throw err;
  }

  return (
    <QueryProvider>
      <SSEProvider>
        <div className="flex min-h-dvh flex-col pb-safe">
          <TopBar user={userBasic} />
          <div className="flex flex-1 min-h-0">{children}</div>
        </div>
      </SSEProvider>
    </QueryProvider>
  );
}
