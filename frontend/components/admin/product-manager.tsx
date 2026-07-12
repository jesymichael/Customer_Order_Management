"use client";

import { useRef, useState } from "react";

import { Button, Card, Input, Label } from "../ui";
import { EmptyState } from "../shell/page";
import { CheckIcon, TagIcon } from "../icons";
import { money } from "@/lib/format";

type Product = { id: string; name: string; price: string };

export function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  function showError(message: string) {
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
    setJustAdded(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("price"));
    if (!name) return showError("Enter a product name.");
    if (!(price > 0)) return showError("Price must be greater than 0.");

    setPending(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price }),
      });
      const payload = await res.json();
      if (!res.ok) return showError(payload?.error?.message ?? "Could not add product.");
      setProducts((p) => [{ id: payload.data.id, name: payload.data.name, price: payload.data.price }, ...p]);
      setJustAdded(payload.data.name);
      formRef.current?.reset();
    } catch {
      showError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
      {/* Create */}
      <Card className="lg:sticky lg:top-24">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Add product</h2>
        </div>
        <div ref={wrapRef} className="t-input-wrap px-5 py-5">
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            <div ref={shakeRef} className="t-input space-y-4 rounded-md">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g. Wireless Mouse" maxLength={200} onInput={clearError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-7 tnum"
                    onInput={clearError}
                  />
                </div>
              </div>
            </div>

            <p className="t-error-msg text-sm text-destructive" role="alert">
              {error}
            </p>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Adding…" : "Add product"}
            </Button>
            {justAdded && (
              <p className="inline-flex items-center gap-1 text-sm text-success">
                <CheckIcon width={15} height={15} /> Added &ldquo;{justAdded}&rdquo;
              </p>
            )}
          </form>
        </div>
      </Card>

      {/* List */}
      {products.length === 0 ? (
        <EmptyState
          icon={<TagIcon width={22} height={22} />}
          title="No products"
          description="Add your first product with the form. It'll be available to customers immediately."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Catalog</h2>
            <span className="tnum text-sm text-muted-foreground">{products.length}</span>
          </div>
          <ul className="divide-y">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <TagIcon width={16} height={16} />
                  </span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <span className="tnum text-sm text-muted-foreground">${money(p.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
