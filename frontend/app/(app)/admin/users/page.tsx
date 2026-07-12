import { cookies } from "next/headers";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";
import { dateTime } from "@/lib/format";
import { EmptyState, PageBody, PageHeader } from "@/components/shell/page";
import { UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type User = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
};

async function getUsers(): Promise<User[]> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <>
      <PageHeader
        title="Users"
        description={`${users.length} registered ${users.length === 1 ? "customer" : "customers"}`}
      />
      <PageBody>
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon width={22} height={22} />}
            title="No users yet"
            description="Customer accounts appear here as people register."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-4 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Customer</span>
              <span>Mobile</span>
              <span>Joined</span>
            </div>
            <ul className="divide-y">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center sm:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {(u.name || u.email).slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name || "—"}</p>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <span className="tnum text-sm text-muted-foreground">{u.phone || "—"}</span>
                  <span className="text-sm text-muted-foreground">{dateTime(u.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PageBody>
    </>
  );
}
