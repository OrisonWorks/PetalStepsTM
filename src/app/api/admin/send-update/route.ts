import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";
import { waCloudConfigured, waSendText } from "@/lib/whatsapp";
import { waLink, waNumber } from "@/lib/utils";

// One entry point for "message a customer": sends through the WhatsApp
// Cloud API when it's configured, otherwise hands back a wa.me link the
// caller opens — same button works in both worlds.
export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!waNumber(to)) {
    return NextResponse.json({ ok: false, error: "a phone number is required" }, { status: 400 });
  }
  if (!message || message.length > 2000) {
    return NextResponse.json({ ok: false, error: "message required (max 2000 chars)" }, { status: 400 });
  }
  if (!waCloudConfigured()) {
    return NextResponse.json({ ok: true, mode: "link", link: waLink(message) });
  }
  const r = await waSendText(to, message);
  if (!r.ok) {
    // A failed Cloud API send (e.g. outside the 24h window) should never
    // strand the follow-up — the caller can still open the link itself.
    return NextResponse.json({ ok: true, mode: "link", link: waLink(message), warn: r.error });
  }
  return NextResponse.json({ ok: true, mode: "sent" });
}
