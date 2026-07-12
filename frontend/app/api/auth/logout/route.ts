import { NextResponse } from "next/server";

import { COOKIE_NAME } from "@/lib/backend";

export async function POST() {
  const out = NextResponse.json({ status: "success", data: null });
  out.cookies.delete(COOKIE_NAME);
  return out;
}
