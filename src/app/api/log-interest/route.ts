import { NextResponse } from "next/server";
import { getProducts } from "@/lib/sheet-products";

// Public, fire-and-forget endpoint: the storefront posts here when a client
// taps "order on WhatsApp" so the shop can see interest before the message
// arrives. No admin cookie — the only write it can cause is an "interest"
// row in the LOG tab. Generous in-memory throttle (per server instance)
// against spam filling the tab.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_IP = 20;

function clientIp(req: Request): string {
  // Only Vercel's own header is trustworthy — plain x-forwarded-for is
  // client-settable and would let a caller rotate IPs past the limit.
  // Off-platform there is no trusted IP, so all callers share one bucket.
  const vff = req.headers.get("x-vercel-forwarded-for");
  if (vff) return vff.split(",")[0].trim();
  return "all";
}

function allowed(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    // prune expired buckets so a flood of distinct IPs can't grow the map
    for (const [k, e] of hits) if (now > e.resetAt) hits.delete(k);
  }
  const e = hits.get(ip);
  if (!e || now > e.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  e.count += 1;
  return e.count <= MAX_PER_IP;
}

export async function POST(req: Request) {
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }
  if (!allowed(clientIp(req))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!model || model.length > 60) {
    return NextResponse.json({ ok: false, error: "model required" }, { status: 400 });
  }
  // Only real catalogue SKUs can be logged — otherwise unauthenticated
  // callers could inject bogus products (or formula strings) into reports.
  const { products } = await getProducts(true);
  if (!products.some((p) => p.sku === model)) {
    return NextResponse.json({ ok: false, error: "unknown model" }, { status: 400 });
  }
  const size = Number(body.size);
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        action: "logEvent",
        event: "interest",
        model,
        size: Number.isInteger(size) && size > 0 ? size : "",
        note,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json({ ok: false, error: data.error || "writer failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
