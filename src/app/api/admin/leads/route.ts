import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Order taps (interest events) never followed by a sale of the same
// model+size — the admin "leads" panel, i.e. unfilled demand.
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
  const qs = new URLSearchParams({ token, kind: "leads" });
  try {
    const res = await fetch(`${base}?${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Writer ${res.status}` },
        { status: 502 }
      );
    }
    const leads = (Array.isArray(data.leads) ? data.leads : [])
      .map((r: { model?: unknown; size?: unknown; taps?: unknown; lastTs?: unknown; who?: unknown; phone?: unknown }) => ({
        model: String(r?.model || ""),
        size: String(r?.size || ""),
        taps: parseInt(String(r?.taps), 10) || 0,
        lastTs: String(r?.lastTs || ""),
        who: String(r?.who || ""),
        phone: String(r?.phone || ""),
      }))
      .filter((r: { model: string }) => r.model);
    return NextResponse.json({ ok: true, leads });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
