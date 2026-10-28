import { NextResponse } from "next/server";
import { subscribeAllowed } from "@/lib/rate-limit";

// Public newsletter signup → SUBSCRIBERS tab via the stock writer.
// Unauthenticated by design; abuse is bounded by a honeypot field
// (bots fill invisible inputs), email validation, and a global
// hourly cap.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (String(body.website || "")) {
    // Honeypot hit — pretend success and store nothing.
    return NextResponse.json({ ok: true });
  }
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  }
  if (!subscribeAllowed()) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts — try again later" },
      { status: 429 }
    );
  }
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "Subscriptions unavailable" }, { status: 503 });
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "subscribe", email }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || "Subscribe failed" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, already: !!data.already });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Stock writer unreachable: ${err}` },
      { status: 502 }
    );
  }
}
