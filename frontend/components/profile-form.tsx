"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, Card, Input, Label } from "./ui";
import { CheckIcon } from "./icons";

type Profile = { id: string; email: string; name: string | null; phone: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function showError(message: string) {
    setSaved(false);
    setError(message);
    wrapRef.current?.classList.add("is-error");
    const el = shakeRef.current;
    if (!el) return;
    el.classList.add("is-error");
    el.classList.remove("is-shaking");
    void el.offsetWidth;
    el.classList.add("is-shaking");
  }

  function clearError() {
    wrapRef.current?.classList.remove("is-error");
    shakeRef.current?.classList.remove("is-error");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    clearError();
    setSaved(false);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = { name: form.get("name") || null, phone: form.get("phone") || null };
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) return showError(payload?.error?.message ?? "Could not save profile.");
      setSaved(true);
      router.refresh();
    } catch {
      showError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Personal information</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your sign-in email can&apos;t be changed.
        </p>
      </div>

      <div ref={wrapRef} className="t-input-wrap px-5 py-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled readOnly />
          </div>

          <div ref={shakeRef} className="t-input space-y-4 rounded-md">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name ?? ""}
                maxLength={100}
                placeholder="Your name"
                onInput={clearError}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="numeric"
                pattern="\d{10,15}"
                placeholder="10–15 digits"
                defaultValue={profile.phone ?? ""}
                onInput={clearError}
              />
            </div>
          </div>

          <p className="t-error-msg text-sm text-destructive" role="alert">
            {error}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <CheckIcon width={15} height={15} /> Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
