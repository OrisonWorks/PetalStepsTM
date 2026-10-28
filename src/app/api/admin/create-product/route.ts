import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Creates a brand-new style: the writer appends one stock-take row per
// size plus metadata overrides on the first row. The sheet parser then
// surfaces the product without a built-in catalogue entry.
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
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(sku)) {
    return NextResponse.json(
      { ok: false, error: "Style code: 2-30 letters, digits, - or _" },
      { status: 400 }
    );
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }
  const price = String(body.price || "").trim();
  if (!(parseInt(price.replace(/[^0-9]/g, ""), 10) > 0)) {
    return NextResponse.json({ ok: false, error: "price must be a positive number" }, { status: 400 });
  }
  const sizes = (Array.isArray(body.sizes) ? body.sizes : [])
    .map((s: { size?: unknown; count?: unknown }) => ({
      size: parseInt(String(s && s.size), 10),
      count: Math.max(0, parseInt(String(s && s.count), 10) || 0),
    }))
    .filter((s: { size: number; count: number }) => s.size >= 30 && s.size <= 50 && s.count > 0);
  if (sizes.length === 0) {
    return NextResponse.json(
      { ok: false, error: "add stock for at least one size" },
      { status: 400 }
    );
  }
  const fields = {
    name,
    price,
    category: String(body.cat || "").slice(0, 30),
    colour: String(body.color || "").slice(0, 40),
    photo: String(body.img || "").slice(0, 500),
    description: String(body.desc || "").slice(0, 500),
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "createProduct", model: sku, fields, sizes }),
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
