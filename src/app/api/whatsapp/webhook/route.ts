import { NextResponse } from "next/server";

// Meta webhook for the WhatsApp Cloud API.
// GET — one-time handshake: Meta sends hub.mode/subscribe + verify_token +
//       challenge; we echo the challenge when the token matches.
// POST — inbound events: each customer text lands in the sheet LOG as a
//        "whatsapp" event so it shows in admin → Activity.
// Set WHATSAPP_VERIFY_TOKEN to any random string and paste the same value
// into Meta's webhook config for https://<site>/api/whatsapp/webhook.

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verify && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === verify) {
    return new NextResponse(q.get("hub.challenge") || "", { status: 200 });
  }
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

interface WaMessage { from?: string; type?: string; text?: { body?: string } }

export async function POST(req: Request) {
  // Always 200 — Meta retries non-2xx forever and the event is best-effort.
  try {
    const body = await req.json().catch(() => ({}));
    const url = process.env.STOCK_WRITER_URL;
    const token = process.env.STOCK_WRITER_TOKEN;
    if (!url || !token) return NextResponse.json({ ok: true });
    const texts: { from: string; body: string }[] = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        for (const m of (change?.value?.messages || []) as WaMessage[]) {
          const t = m.text?.body?.trim();
          if (m.from && t) texts.push({ from: m.from, body: t });
        }
      }
    }
    for (const t of texts.slice(0, 20)) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, action: "logEvent", event: "whatsapp",
          model: "-", note: `from +${t.from}: ${t.body.slice(0, 240)}`,
        }),
        cache: "no-store",
      }).catch(() => undefined);
    }
  } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
