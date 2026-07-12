import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";

// Authenticated proxy: attach the httpOnly cookie's JWT as a Bearer token so
// the browser can call protected endpoints without ever reading the token.
async function forward(method: "GET" | "PATCH", body?: unknown) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { status: "error", data: null, error: { message: "Not authenticated", code: "INVALID_TOKEN" } },
      { status: 401 }
    );
  }
  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET() {
  return forward("GET");
}

export async function PATCH(req: Request) {
  return forward("PATCH", await req.json());
}
