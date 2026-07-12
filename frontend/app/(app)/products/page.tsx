import { BACKEND_URL } from "@/lib/backend";
import { ProductCatalog } from "@/components/product-catalog";
import { PageBody, PageHeader } from "@/components/shell/page";

export const dynamic = "force-dynamic";

type Product = { id: string; name: string; price: string };

async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${BACKEND_URL}/api/products`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <>
      <PageHeader title="Products" description="Add items to your cart, then place an order." />
      <PageBody>
        <ProductCatalog products={products} />
      </PageBody>
    </>
  );
}
