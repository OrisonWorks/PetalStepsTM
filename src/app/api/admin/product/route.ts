import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Editable product fields → sheet column names the Apps Script writes.
// The site parser prefers these sheet values over the built-in catalogue.
const FIELD_MAP: Record<string, string> = {
  name: "name",
  price: "price",
  cat: "category",
  desc: "description",
  img: "photo",
  color: "colour",
  active: "active",
};

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
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  if (!sku) {
    return NextResponse.json({ ok: false, error: "sku required" }, { status: 400 });
  }
  const fields: Record<string, string> = {};
  for (const [key, col] of Object.entries(FIELD_MAP)) {
    if (body[key] == null) continue;
    fields[col] = String(body[key]);
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "updateProduct", model: sku, fields }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Stock writer ${res.status}` },
        { status: 502 }
      );
    }
    revalidateTag("products");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Stock writer unreachable: ${err}` }, { status: 502 });
  }
}
