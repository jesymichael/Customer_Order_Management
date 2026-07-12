const MAP: Record<string, { label: string; cls: string }> = {
  EDITABLE: { label: "Editable", cls: "bg-success/10 text-success ring-success/25" },
  LOCKED: { label: "Locked", cls: "bg-warning/10 text-warning ring-warning/30" },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground ring-border" },
};

/** Order status pill. Pass status; if is_deleted, render Cancelled. */
export function StatusPill({ status, cancelled }: { status: string; cancelled?: boolean }) {
  const key = cancelled ? "CANCELLED" : status;
  const { label, cls } = MAP[key] ?? MAP.CANCELLED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
