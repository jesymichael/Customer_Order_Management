"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LogOutIcon,
  PackageIcon,
  ReceiptIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

type Item = { href: string; label: string; icon: (p: { className?: string }) => JSX.Element };

const NAV: Item[] = [
  { href: "/products", label: "Products", icon: PackageIcon },
  { href: "/orders", label: "Orders", icon: ReceiptIcon },
];

const ADMIN_NAV: Item[] = [
  { href: "/admin/products", label: "Manage products", icon: TagIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
];

export function Brand() {
  return (
    <Link href="/orders" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ReceiptIcon width={17} height={17} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">OrderDesk</span>
    </Link>
  );
}

export function SidebarNav({
  user,
  isAdmin,
  onNavigate,
}: {
  user: string | null;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const renderItem = ({ href, label, icon: Icon }: Item) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-white/10 text-white" : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className={active ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-white"} />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
          Workspace
        </p>
        {NAV.map(renderItem)}

        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
              Admin
            </p>
            {ADMIN_NAV.map(renderItem)}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/profile"
          onClick={onNavigate}
          aria-current={isActive("/profile") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
            isActive("/profile") ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sidebar-foreground">
            <UserIcon width={16} height={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-white">
                {user ? user.split("@")[0] : "Account"}
              </span>
              {isAdmin && (
                <span className="rounded bg-sidebar-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-accent">
                  Admin
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-sidebar-muted">{user ?? "Profile"}</span>
          </span>
        </Link>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOutIcon className="text-sidebar-muted" />
          Sign out
        </button>
      </div>
    </div>
  );
}
