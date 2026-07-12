import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";

export const dynamic = "force-dynamic";

// Server-side admin gate for every /admin/* page (not just hidden nav).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const isAdmin = res.ok && (await res.json()).data?.is_admin;
  if (!isAdmin) redirect("/orders");
  return <>{children}</>;
}
