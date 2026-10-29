import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Aggregated reads for the admin dashboard + analytics tab: pulls LOG,
// RECEIPTS (keys stripped) and SUBSCRIBERS from the sheet writer in one
// call. Aggregation happens client-side.
export async function GET() {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  const get = async (qs: string) => {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}&${qs}`, { cache: "no-store" });
    return res.json().catch(() => ({}));
  };
  try {
    const [log, receipts, subs] = await Promise.all([
      get("kind=log&n=1000"),
      get("kind=receipts"),
      get("kind=subscribers"),
    ]);
    return NextResponse.json({
      ok: true,
      log: log.rows || [],
      receipts: receipts.receipts || [],
      subscribers: subs.subscribers || [],
      receiptsSupported: receipts.ok === true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Writer unreachable" }, { status: 502 });
  }
}
