import { proxy } from "@/lib/proxy";

export async function GET() {
  return proxy("GET", "/api/orders");
}

export async function POST(req: Request) {
  return proxy("POST", "/api/orders", await req.json());
}
