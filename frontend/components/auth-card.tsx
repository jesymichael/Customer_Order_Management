"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button, Input, Label } from "./ui";
import { ReceiptIcon } from "./icons";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to manage your orders.",
    cta: "Sign in",
    alt: "Need an account?",
    altHref: "/register",
    altLabel: "Create one",
  },
  register: {
    title: "Create your account",
    subtitle: "Start placing and tracking orders.",
    cta: "Create account",
    alt: "Already have an account?",
    altHref: "/login",
    altLabel: "Sign in",
  },
};

export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const wrapRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Adapted from transitions-dev/12: replay the shake from a clean baseline.
  function showError(message: string) {
    setError(message);
    wrapRef.current?.classList.add("is-error");
    const el = shakeRef.current;
    if (!el) return;
    el.classList.add("is-error");
    el.classList.remove("is-shaking");
    void el.offsetWidth; // force reflow
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
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = { email: form.get("email"), password: form.get("password") };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        showError(payload?.error?.message ?? "Something went wrong. Try again.");
        return;
      }
      if (mode === "register" && !payload.data?.signedIn) {
        router.push("/login");
      } else {
        router.push("/orders");
        router.refresh();
      }
    } catch {
      showError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {/* Mobile brand mark (brand panel is hidden below lg) */}
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ReceiptIcon width={17} height={17} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">OrderDesk</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>

      <div ref={wrapRef} className="t-input-wrap mt-7">
        <form onSubmit={onSubmit} className="space-y-4">
          <div ref={shakeRef} className="t-input space-y-4 rounded-md">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required onInput={clearError} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 8 : undefined}
                required
                onInput={clearError}
              />
              {mode === "register" && (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              )}
            </div>
          </div>

          <p className="t-error-msg text-sm text-destructive" role="alert">
            {error}
          </p>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : copy.cta}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {copy.alt}{" "}
        <Link href={copy.altHref} className="font-medium text-primary hover:underline">
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
