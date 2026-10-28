import { NextResponse } from "next/server";

// Public receipt lookup for the shareable /receipt/[no] page. The writer
// token stays server-side; only the single receipt's display fields leak.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ no: string }> }
) {
  const base = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }
  const { no } = await params;
  if (!/^PS-\d{1,8}$/i.test(no)) {
    return NextResponse.json({ ok: false, error: "invalid receipt number" }, { status: 400 });
  }
  const qs = new URLSearchParams({ token, kind: "receipt", no: no.toUpperCase() });
  try {
    const res = await fetch(`${base}?${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    const { phone: _phone, ...receipt } = data.receipt || {};
    return NextResponse.json({ ok: true, receipt });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
