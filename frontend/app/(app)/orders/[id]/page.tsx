import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";
import { OrderDetail } from "@/components/order-detail";

export const dynamic = "force-dynamic";

async function getOrder(id: string) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const res = await fetch(`${BACKEND_URL}/api/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

async function getProductNames(): Promise<Record<string, string>> {
  const res = await fetch(`${BACKEND_URL}/api/products`, { cache: "no-store" });
  if (!res.ok) return {};
  const products: { id: string; name: string }[] = (await res.json()).data ?? [];
  return Object.fromEntries(products.map((p) => [p.id, p.name]));
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  if (!order) notFound();
  const names = await getProductNames();

  return <OrderDetail initialOrder={order} productNames={names} />;
}
