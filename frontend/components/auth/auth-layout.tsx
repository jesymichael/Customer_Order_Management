import { ClockIcon, PackageIcon, ReceiptIcon } from "@/components/icons";

const FEATURES = [
  { icon: PackageIcon, title: "Browse & order", body: "Build an order from the catalog in seconds." },
  { icon: ClockIcon, title: "48-hour edit window", body: "Adjust quantities or cancel while it's still open." },
  { icon: ReceiptIcon, title: "Full change history", body: "Every modification is captured, before and after." },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ReceiptIcon width={17} height={17} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">OrderDesk</span>
        </div>

        <div className="max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Order management, with a memory.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-muted">
            Place orders, adjust them within 48 hours, and keep a complete, tamper-proof audit trail
            of every change.
          </p>

          <ul className="mt-8 space-y-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-accent">
                  <Icon width={18} height={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-sidebar-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-muted">Customer Order Management</p>
      </aside>

      {/* Form area */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
