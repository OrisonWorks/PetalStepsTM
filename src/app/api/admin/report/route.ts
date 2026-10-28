import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Reads the LOG tab via the Apps Script doGet endpoint and returns rows for
// the admin reports section. `day` (YYYY-MM-DD) filters server-side.
export async function GET(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const base = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  const day = new URL(req.url).searchParams.get("day") || "";
  const qs = new URLSearchParams({ token, kind: "log", n: "800" });
  try {
    const res = await fetch(`${base}?${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Writer ${res.status}` },
        { status: 502 }
      );
    }
    const rows = (data.rows || []).filter(
      (r: { ts?: string }) => !day || String(r.ts || "").startsWith(day)
    );
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
