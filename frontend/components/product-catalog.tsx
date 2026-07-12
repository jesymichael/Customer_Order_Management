"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui";
import { EmptyState } from "./shell/page";
import { CartIcon, MinusIcon, PackageIcon, PlusIcon } from "./icons";
import { money } from "@/lib/format";

type Product = { id: string; name: string; price: string };

export function ProductCatalog({ products }: { products: Product[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const priceOf = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, Number(p.price)])),
    [products]
  );
  const total = Object.entries(cart).reduce((s, [id, q]) => s + priceOf[id] * q, 0);
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  async function placeOrder() {
    if (pending || itemCount === 0) return;
    setError("");
    setPending(true);
    const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }));
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.status === 401) return router.push("/login");
      const payload = await res.json();
      if (!res.ok) return setError(payload?.error?.message ?? "Could not place order.");
      router.push(`/orders/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageIcon width={22} height={22} />}
        title="No products yet"
        description="Products are seeded by an administrator. Once they exist, they'll appear here to order."
      />
    );
  }

  return (
    <div className="pb-4">
      <ul className="space-y-2">
        {products.map((p, i) => {
          const qty = cart[p.id] ?? 0;
          return (
            <li
              key={p.id}
              className="animate-rise flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 shadow-sm"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="tnum mt-0.5 text-sm text-muted-foreground">${money(p.price)}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                <StepBtn onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0} label="Decrease">
                  <MinusIcon width={16} height={16} />
                </StepBtn>
                <span className="tnum w-8 text-center text-sm font-medium">{qty}</span>
                <StepBtn onClick={() => setQty(p.id, qty + 1)} label="Increase">
                  <PlusIcon width={16} height={16} />
                </StepBtn>
              </div>
            </li>
          );
        })}
      </ul>

      {itemCount > 0 && (
        <div className="sticky bottom-4 z-10 mt-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-card/95 p-2.5 pl-5 shadow-lg backdrop-blur">
            <div className="text-sm">
              <span className="text-muted-foreground">
                {itemCount} item{itemCount > 1 ? "s" : ""}
              </span>{" "}
              · <span className="tnum font-semibold">${money(total)}</span>
            </div>
            <Button onClick={placeOrder} disabled={pending}>
              {pending ? "Placing…" : "Place order"}
              <CartIcon width={16} height={16} />
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StepBtn({
  children,
  label,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-muted active:scale-90 disabled:opacity-30 disabled:active:scale-100"
      {...props}
    >
      {children}
    </button>
  );
}
