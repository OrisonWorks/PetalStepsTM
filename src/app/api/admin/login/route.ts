import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, expectedCookieValue, passcodeValid } from "@/lib/admin-auth";
import { clearLoginAttempts, loginAttemptAllowed } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "Admin not configured" }, { status: 503 });
  }
  // Counted before the first await so parallel requests can't all pass the
  // limit check before any of them records an attempt.
  if (!loginAttemptAllowed()) {
    return NextResponse.json({ ok: false, error: "Too many attempts — try again later" }, { status: 429 });
  }
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  if (typeof passcode !== "string" || !passcodeValid(passcode)) {
    return NextResponse.json({ ok: false, error: "Wrong passcode" }, { status: 401 });
  }
  clearLoginAttempts();
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
