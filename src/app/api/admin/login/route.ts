import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, expectedCookieValue, passcodeValid } from "@/lib/admin-auth";
import { clearLoginFailures, loginRateLimited, recordLoginFailure } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "Admin not configured" }, { status: 503 });
  }
  if (loginRateLimited(req)) {
    return NextResponse.json({ ok: false, error: "Too many attempts — try again later" }, { status: 429 });
  }
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  if (typeof passcode !== "string" || !passcodeValid(passcode)) {
    recordLoginFailure(req);
    return NextResponse.json({ ok: false, error: "Wrong passcode" }, { status: 401 });
  }
  clearLoginFailures(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expectedCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
