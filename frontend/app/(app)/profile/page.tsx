import { cookies } from "next/headers";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";
import { ProfileForm } from "@/components/profile-form";
import { PageBody, PageHeader } from "@/components/shell/page";

export const dynamic = "force-dynamic";

async function getProfile() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) return null;

  return (
    <>
      <PageHeader title="Profile" description="Manage your account details." />
      <PageBody>
        <ProfileForm profile={profile} />
      </PageBody>
    </>
  );
}
