import { cookies } from "next/headers";
import Link from "next/link";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";
import { money, dateTime, orderNo } from "@/lib/format";
import { Button } from "@/components/ui";
import { EmptyState, PageBody, PageHeader } from "@/components/shell/page";
import { StatusPill } from "@/components/status";
import { ReceiptIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type OrderSummary = {
  id: string;
  order_number: number;
  status: "EDITABLE" | "LOCKED";
  total_amount: string;
  item_count: number;
  is_deleted: boolean;
  created_at: string;
};

async function getOrders(): Promise<OrderSummary[]> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const res = await fetch(`${BACKEND_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <>
      <PageHeader
        title="Orders"
        description={orders.length ? `${orders.length} order${orders.length > 1 ? "s" : ""}` : undefined}
        actions={
          <Link href="/products">
            <Button size="sm">New order</Button>
          </Link>
        }
      />
      <PageBody>
        {orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon width={22} height={22} />}
            title="No orders yet"
            description="When you place an order it will appear here with its status and full change history."
            action={
              <Link href="/products">
                <Button>Browse products</Button>
              </Link>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {orders.map((o, i) => (
              <li key={o.id} className={i > 0 ? "border-t" : ""}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ReceiptIcon width={17} height={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="tnum font-medium">
                      {orderNo(o.order_number)}
                      <span className="ml-2 font-normal text-muted-foreground">${money(o.total_amount)}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {o.item_count} item{o.item_count === 1 ? "" : "s"} · {dateTime(o.created_at)}
                    </p>
                  </div>
                  <StatusPill status={o.status} cancelled={o.is_deleted} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
