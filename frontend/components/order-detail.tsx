"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button, Card } from "./ui";
import { PageBody, PageHeader } from "./shell/page";
import { StatusPill } from "./status";
import { ArrowLeftIcon, ClockIcon, MinusIcon, PlusIcon, TrashIcon } from "./icons";
import { money, dateTime, editWindowLeft, orderNo } from "@/lib/format";

type Item = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  is_deleted: boolean;
  created_at: string;
};
type History = {
  id: string;
  modification_type: string;
  modified_at: string;
  item_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};
type Order = {
  id: string;
  order_number: number;
  status: "EDITABLE" | "LOCKED";
  total_amount: string;
  is_deleted: boolean;
  created_at: string;
  items: Item[];
  modification_history: History[];
};

const TYPE_LABEL: Record<string, string> = {
  ITEM_ADDED: "Item added",
  QUANTITY_CHANGE: "Quantity changed",
  ITEM_REMOVED: "Item removed",
  ORDER_CANCELLED: "Order cancelled",
};
const TYPE_DOT: Record<string, string> = {
  ITEM_ADDED: "bg-success",
  QUANTITY_CHANGE: "bg-primary",
  ITEM_REMOVED: "bg-warning",
  ORDER_CANCELLED: "bg-destructive",
};

export function OrderDetail({
  initialOrder,
  productNames,
}: {
  initialOrder: Order;
  productNames: Record<string, string>;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [left, setLeft] = useState<string | null>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const editable = order.status === "EDITABLE" && !order.is_deleted;
  const name = (id: string) => productNames[id] ?? "Item " + id.slice(0, 6);
  const activeItems = order.items.filter((i) => !i.is_deleted);

  // Live edit-window countdown (client only, ticks each minute).
  useEffect(() => {
    if (order.is_deleted) return;
    const tick = () => setLeft(editWindowLeft(order.created_at));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [order.created_at, order.is_deleted]);

  async function act(key: string, path: string, method: string, body?: unknown) {
    if (busy) return;
    setError("");
    setBusy(key);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? "Action failed.");
        errRef.current?.classList.remove("animate-rise");
        void errRef.current?.offsetWidth;
        errRef.current?.classList.add("animate-rise");
        return;
      }
      setOrder(payload.data);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const setQty = (it: Item, q: number) =>
    act(`q${it.id}`, `/api/orders/${order.id}/items/${it.id}`, "PATCH", { quantity: q });
  const remove = (it: Item) => act(`r${it.id}`, `/api/orders/${order.id}/items/${it.id}`, "DELETE");
  const cancel = () => act("cancel", `/api/orders/${order.id}`, "DELETE");

  return (
    <>
      <PageHeader
        title={`Order ${orderNo(order.order_number)}`}
        description={`Placed ${dateTime(order.created_at)}`}
        actions={<StatusPill status={order.status} cancelled={order.is_deleted} />}
      />
      <PageBody>
        <Link
          href="/orders"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon width={16} height={16} /> Orders
        </Link>

        {/* Summary */}
        <Card className="mb-4 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order total</p>
              <p className="tnum mt-0.5 text-3xl font-semibold tracking-tight">
                ${money(order.total_amount)}
              </p>
            </div>
            {editable && left && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success ring-1 ring-inset ring-success/25">
                <ClockIcon width={14} height={14} />
                {left}
              </span>
            )}
          </div>

          {!editable && !order.is_deleted && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-warning/10 px-3.5 py-3 text-sm text-warning ring-1 ring-inset ring-warning/25">
              <ClockIcon width={16} height={16} className="mt-0.5 shrink-0" />
              <span className="text-foreground/80">
                This order is locked. The 48-hour modification window has closed, so items can no
                longer be changed.
              </span>
            </div>
          )}
        </Card>

        {/* Items */}
        <Card className="mb-4">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Items</h2>
            <span className="tnum text-sm text-muted-foreground">{activeItems.length} active</span>
          </div>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                  item.is_deleted ? "opacity-55" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-medium ${item.is_deleted ? "line-through" : ""}`}>
                    {name(item.product_id)}
                  </p>
                  <p className="tnum mt-0.5 text-sm text-muted-foreground">
                    ${money(item.unit_price)} · qty {item.quantity}
                    {item.is_deleted && <span className="ml-1.5 not-italic text-warning">· removed</span>}
                  </p>
                </div>
                {editable && !item.is_deleted && (
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                      <IconBtn
                        onClick={() => setQty(item, item.quantity - 1)}
                        disabled={!!busy || item.quantity <= 1}
                        label="Decrease quantity"
                      >
                        <MinusIcon width={15} height={15} />
                      </IconBtn>
                      <span className="tnum w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <IconBtn
                        onClick={() => setQty(item, item.quantity + 1)}
                        disabled={!!busy}
                        label="Increase quantity"
                      >
                        <PlusIcon width={15} height={15} />
                      </IconBtn>
                    </div>
                    <IconBtn onClick={() => remove(item)} disabled={!!busy} label="Remove item" danger>
                      <TrashIcon width={15} height={15} />
                    </IconBtn>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <div className="border-t px-5 py-3">
              <Button variant="destructive" size="sm" onClick={cancel} disabled={!!busy}>
                {busy === "cancel" ? "Cancelling…" : "Cancel order"}
              </Button>
            </div>
          )}
        </Card>

        {error && (
          <p ref={errRef} className="animate-rise mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Activity timeline */}
        <section>
          <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">Activity</h2>
          <ol className="rounded-xl border bg-card p-5 shadow-sm">
            {order.modification_history.map((h, i, arr) => (
              <li key={h.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-card ${
                      TYPE_DOT[h.modification_type] ?? "bg-muted-foreground"
                    }`}
                  />
                  {i < arr.length - 1 && <span className="my-0.5 w-px flex-1 bg-border" />}
                </div>
                <div className={i < arr.length - 1 ? "pb-5" : ""}>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">
                      {TYPE_LABEL[h.modification_type] ?? h.modification_type}
                    </span>
                    <time className="text-xs text-muted-foreground">{dateTime(h.modified_at)}</time>
                  </div>
                  {describe(h) && (
                    <p className="tnum mt-0.5 text-sm text-muted-foreground">{describe(h)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </PageBody>
    </>
  );
}

function describe(h: History): string {
  const o = h.old_value?.quantity;
  const n = h.new_value?.quantity;
  if (h.modification_type === "QUANTITY_CHANGE" && o != null && n != null)
    return `Quantity ${String(o)} → ${String(n)}`;
  if (h.modification_type === "ITEM_REMOVED") return "Item removed from order";
  if (h.modification_type === "ITEM_ADDED" && n != null) return `Added · qty ${String(n)}`;
  if (h.modification_type === "ORDER_CANCELLED") return "All items removed";
  return "";
}

function IconBtn({
  children,
  label,
  danger,
  ...props
}: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 disabled:opacity-30 disabled:active:scale-100 ${
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-foreground hover:bg-muted"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
