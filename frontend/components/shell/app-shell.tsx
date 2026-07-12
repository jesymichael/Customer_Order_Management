"use client";

import { useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { Brand, SidebarNav } from "./sidebar-nav";

export function AppShell({
  user,
  isAdmin,
  children,
}: {
  user: string | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar md:flex">
        <SidebarNav user={user} isAdmin={isAdmin} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
        >
          <MenuIcon width={20} height={20} />
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs">
            O
          </span>
          OrderDesk
        </span>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 bg-sidebar shadow-xl transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-white/5 hover:text-white"
          >
            <CloseIcon width={18} height={18} />
          </button>
          <SidebarNav user={user} isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
