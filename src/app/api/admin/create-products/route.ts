import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";
import { validateNewProduct, writerCreateProduct } from "@/lib/new-product";

const MAX_ITEMS = 200;

// Bulk createProduct: one writer call per item (the writer holds a
// spreadsheet lock per call, so a single batched call has no benefit).
// Per-item results come back so the UI can report which rows landed.
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
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json(
      { ok: false, error: `send 1-${MAX_ITEMS} items` },
      { status: 400 }
    );
  }
  const results: { model: string; ok: boolean; error?: string }[] = [];
  let created = 0;
  for (const item of items) {
    const model = String((item && item.sku) || "");
    const product = validateNewProduct(item);
    if ("error" in product) {
      results.push({ model: model || "?", ok: false, error: product.error });
      continue;
    }
    const result = await writerCreateProduct(url, token, product);
    if ("error" in result) {
      results.push({ model: product.sku, ok: false, error: result.error });
    } else {
      results.push({ model: product.sku, ok: true });
      created++;
    }
  }
  if (created > 0) revalidateTag("products");
  return NextResponse.json({ ok: true, created, results });
}
