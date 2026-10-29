import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Sends the composed newsletter to every SUBSCRIBERS row via the writer's
// sendNewsletter action. The writer enforces the Gmail daily quota and
// returns {total, sent, failed, remaining} so the UI can report a partial
// send honestly.
export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const base = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  let body: { subject?: unknown; html?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const subject = String(body.subject || "").trim().slice(0, 200);
  const html = String(body.html || "").slice(0, 60000);
  const text = String(body.text || "").slice(0, 20000);
  if (!subject || (!html && !text)) {
    return NextResponse.json({ ok: false, error: "subject and body required" }, { status: 400 });
  }
  try {
    // Apps Script POSTs 302 to an echo URL — fetch the redirect with GET.
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
      body: JSON.stringify({ token, action: "sendNewsletter", subject, html, text }),
    });
    const loc = res.headers.get("location");
    const echoUrl = res.status >= 300 && res.status < 400 && loc ? loc : null;
    const data = await (echoUrl
      ? fetch(echoUrl, { cache: "no-store" }).then((r) => r.json())
      : res.json()
    ).catch(() => ({}));
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.error || "writer error" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      total: data.total ?? 0,
      sent: data.sent ?? 0,
      failed: data.failed ?? 0,
      remaining: data.remaining ?? 0,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
