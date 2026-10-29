import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Reads the SUBSCRIBERS tab via the Apps Script doGet endpoint for the admin
// subscribers panel.
export async function GET() {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const base = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  const qs = new URLSearchParams({ token, kind: "subscribers" });
  try {
    const res = await fetch(`${base}?${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Writer ${res.status}` },
        { status: 502 }
      );
    }
    const list = (Array.isArray(data.subscribers) ? data.subscribers : [])
      .map((r: { ts?: unknown; email?: unknown; status?: unknown }) => ({
        ts: String(r?.ts || ""),
        email: String(r?.email || "").trim(),
        status: String(r?.status || "").trim(),
      }))
      .filter((r: { email: string }) => r.email);
    return NextResponse.json({ ok: true, subscribers: list });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
