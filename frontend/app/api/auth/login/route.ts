import { NextResponse } from "next/server";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";

// COM-13: proxy login to FastAPI, store the JWT in an httpOnly cookie so the
// browser never touches the token (NFR-13).
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json();

  if (!res.ok || payload.status !== "success" || !payload.data?.jwt_token) {
    return NextResponse.json(payload, { status: res.status || 401 });
  }

  const out = NextResponse.json({ status: "success", data: { id: payload.data.id } });
  out.cookies.set(COOKIE_NAME, payload.data.jwt_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h, matches the Supabase token expiry
  });
  return out;
}
