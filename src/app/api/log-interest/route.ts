import { NextResponse } from "next/server";

// Public, fire-and-forget endpoint: the storefront posts here when a client
// taps "order on WhatsApp" so the shop can see interest before the message
// arrives. No admin cookie — the only write it can cause is an "interest"
// row in the LOG tab. Generous in-memory throttle (per server instance)
// against spam filling the tab.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_IP = 20;

function clientIp(req: Request): string {
  // Vercel sets x-vercel-forwarded-for; fall back to first XFF hop or a
  // bucket key when behind an unknown proxy.
  const vff = req.headers.get("x-vercel-forwarded-for");
  if (vff) return vff.split(",")[0].trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "anon";
}

function allowed(ip: string): boolean {
  const now = Date.now();
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
