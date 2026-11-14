import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";
import { auditWrite } from "@/lib/audit";

async function auth() {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) return null;
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  return url && token ? { url, token } : null;
}

export async function GET() {
  const config = await auth();
  if (!config) return NextResponse.json({ ok: false, error: "Unauthorized or not configured" }, { status: 401 });
  try {
    const res = await fetch(
      `${config.url}?token=${encodeURIComponent(config.token)}&kind=compliance`,
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
  const allowed = new Set(["registerReceipt", "recordReceiptException", "closeFilingPeriod", "addFilingEvidence"]);
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: "Unsupported compliance action" }, { status: 400 });
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.token, action, fields: body.fields || {} }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) return NextResponse.json(data, { status: 502 });
    auditWrite("compliance", "-", `${action} · ${body.fields?.period || body.fields?.receiptNo || ""}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: "Writer unreachable" }, { status: 502 });
  }
}
