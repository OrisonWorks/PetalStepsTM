import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Admin audit trail: writes an event row into the LOG tab via the writer's
// logEvent action. Fire-and-forget from the client — a stale writer that
// doesn't recognise the new event names just rejects the row.
const EVENTS = new Set(["edit", "create", "receipt", "unsubscribe"]);

export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const event = typeof body.event === "string" ? body.event.trim() : "";
  if (!EVENTS.has(event)) {
    return NextResponse.json({ ok: false, error: "unknown event" }, { status: 400 });
  }
  const model = typeof body.model === "string" ? body.model.trim().slice(0, 60) : "-";
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "logEvent", event, model: model || "-", note }),
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
