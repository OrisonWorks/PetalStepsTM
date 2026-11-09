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
  const sp = new URL(req.url).searchParams;
  const day = sp.get("day") || "";
  const period = sp.get("period") || "day";

  // Range bounds for week/month periods — computed here so the writer's
  // `day` filter isn't needed; we pull a wider window and filter locally.
  let from = day;
  let to = day;
  if (period === "week" && day) {
    const d = new Date(day + "T00:00:00Z");
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    const start = new Date(d.getTime() - dow * 864e5);
    from = start.toISOString().slice(0, 10);
    to = new Date(start.getTime() + 6 * 864e5).toISOString().slice(0, 10);
  } else if (period === "month" && day) {
    from = day.slice(0, 8) + "01";
    to = day.slice(0, 8) + "31";
  }

  // The day filter runs inside the writer so the row cap can't drop an
  // older day's events behind newer ones; period ranges filter locally.
  const qs = new URLSearchParams({ token, kind: "log", n: period === "day" ? "800" : "5000" });
  if (period === "day" && day) qs.set("day", day);
  try {
    const res = await fetch(`${base}?${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Writer ${res.status}` },
        { status: 502 }
      );
    }
    let rows: { ts?: string }[] = data.rows || [];
    if (period !== "day" && from) {
      rows = rows.filter((r) => {
        const d = String(r.ts || "").slice(0, 10);
        return d >= from && d <= to;
      });
    }
    return NextResponse.json({ ok: true, rows, from, to });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
