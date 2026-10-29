import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Marks a subscriber STATUS=stop in the sheet (honoring reply-STOP) —
// suppression, not deletion: the address stays for dedupe and a future
// resubscribe clears the marker.
export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const base = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
      body: JSON.stringify({ token, action: "unsubscribe", email }),
    });
    const loc = res.headers.get("location");
    const data = await (res.status >= 300 && res.status < 400 && loc
      ? fetch(loc, { cache: "no-store" }).then((r) => r.json())
      : res.json()
    ).catch(() => ({}));
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.error || "writer error" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
