import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Uploads a product photo: forwards base64 image data to the Apps Script
// writer's uploadPhoto action, which files it in the shared Drive folder
// and returns a public URL that goes in the sheet's photo column.
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
  let body: { type?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const mime = String(body.type || "");
  const data = String(body.data || "");
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(mime)) {
    return NextResponse.json({ ok: false, error: "unsupported image type" }, { status: 400 });
  }
  // 3 MB binary ≈ 4 MB base64 — stays under Vercel's 4.5 MB function
  // payload limit (the client caps at 3 MB).
  if (data.length > 4.5 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "image too large" }, { status: 400 });
  }
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
      body: JSON.stringify({ token, action: "uploadPhoto", mime, data }),
    });
    const loc = res.headers.get("location");
    const d = await (res.status >= 300 && res.status < 400 && loc
      ? fetch(loc, { cache: "no-store" }).then((r) => r.json())
      : res.json()
    ).catch(() => ({}));
    if (!d.ok || !d.url) {
      return NextResponse.json({ ok: false, error: d.error || "writer error" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, url: String(d.url) });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
