import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";

export const dynamic = "force-dynamic";

async function getUser(): Promise<{ email: string; isAdmin: boolean } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()).data;
  return { email: data?.email ?? "", isAdmin: !!data?.is_admin };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login"); // single auth gate for the whole app section
  return (
    <AppShell user={user.email} isAdmin={user.isAdmin}>
      {children}
    </AppShell>
  );
}
