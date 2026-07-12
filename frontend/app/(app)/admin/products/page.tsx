import { BACKEND_URL } from "@/lib/backend";
import { ProductManager } from "@/components/admin/product-manager";
import { PageBody, PageHeader } from "@/components/shell/page";

export const dynamic = "force-dynamic";

type Product = { id: string; name: string; price: string; created_at?: string };

async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${BACKEND_URL}/api/products`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

export default async function AdminProductsPage() {
  const products = await getProducts();
  return (
    <>
      <PageHeader title="Manage products" description="Add products to the catalog." />
      <PageBody>
        <ProductManager initialProducts={products} />
      </PageBody>
    </>
  );
}
