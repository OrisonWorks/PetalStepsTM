import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

async function auth() {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) return null;
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  return url && token ? { url, token } : null;
}

async function writerPost(config: { url: string; token: string }, action: string, fields: Record<string, unknown> = {}) {
  const res = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
    body: JSON.stringify({ token: config.token, action, fields }),
    cache: "no-store",
  });
  const location = res.headers.get("location");
  const result = res.status >= 300 && res.status < 400 && location
    ? await fetch(new URL(location, config.url), { cache: "no-store" })
    : res;
  return result.json().catch(() => ({}));
}

export async function GET() {
  const config = await auth();
  if (!config) return NextResponse.json({ ok: false, error: "Unauthorized or not configured" }, { status: 401 });
  try {
    const res = await fetch(
      `${config.url}?token=${encodeURIComponent(config.token)}&kind=reportSettings`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: data.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "Writer unreachable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const config = await auth();
  if (!config) return NextResponse.json({ ok: false, error: "Unauthorized or not configured" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  if (!["updateDigestSettings", "sendDigestTest"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Unsupported digest action" }, { status: 400 });
  }
  try {
    const data = await writerPost(config, action, body.fields || {});
    return NextResponse.json(data, { status: data.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "Writer unreachable" }, { status: 502 });
  }
}
