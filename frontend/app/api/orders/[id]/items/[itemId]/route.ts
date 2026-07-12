import { proxy } from "@/lib/proxy";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  return proxy("PATCH", `/api/orders/${params.id}/items/${params.itemId}`, await req.json());
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  return proxy("DELETE", `/api/orders/${params.id}/items/${params.itemId}`);
}
