import { proxy } from "@/lib/proxy";

export async function GET() {
  return proxy("GET", "/api/admin/users");
}
