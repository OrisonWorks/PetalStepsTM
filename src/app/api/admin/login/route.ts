import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, expectedCookieValue, passcodeValid } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "Admin not configured" }, { status: 503 });
  }
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  if (typeof passcode !== "string" || !passcodeValid(passcode)) {
    return NextResponse.json({ ok: false, error: "Wrong passcode" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expectedCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
