import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BACKEND_URL, COOKIE_NAME } from "./backend";

// Attach the httpOnly cookie's JWT as a Bearer token and forward to FastAPI.
// Keeps the token off the browser while letting client components call
// protected endpoints through same-origin Next routes.
export async function proxy(method: string, path: string, body?: unknown) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { status: "error", data: null, error: { message: "Not authenticated", code: "INVALID_TOKEN" } },
      { status: 401 }
    );
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
