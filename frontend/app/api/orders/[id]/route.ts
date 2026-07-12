import { proxy } from "@/lib/proxy";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return proxy("GET", `/api/orders/${params.id}`);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return proxy("DELETE", `/api/orders/${params.id}`);
}
