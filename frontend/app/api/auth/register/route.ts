import { NextResponse } from "next/server";

import { BACKEND_URL, COOKIE_NAME } from "@/lib/backend";

// COM-12: proxy registration to FastAPI. If Supabase issues a JWT immediately
// (email confirmation disabled), store it as an httpOnly cookie so the user
// lands signed in.
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json();

  if (!res.ok || payload.status !== "success") {
    return NextResponse.json(payload, { status: res.status || 400 });
  }

  const out = NextResponse.json(
    { status: "success", data: { id: payload.data.id, signedIn: !!payload.data.jwt_token } },
    { status: 201 }
  );
  if (payload.data.jwt_token) {
    out.cookies.set(COOKIE_NAME, payload.data.jwt_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return out;
}
