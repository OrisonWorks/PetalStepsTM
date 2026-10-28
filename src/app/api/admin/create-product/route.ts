import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";
import { validateNewProduct, writerCreateProduct } from "@/lib/new-product";

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
  const product = validateNewProduct(body);
  if ("error" in product) {
    return NextResponse.json({ ok: false, error: product.error }, { status: 400 });
  }
  const result = await writerCreateProduct(url, token, product);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  revalidateTag("products");
  return NextResponse.json({ ok: true, model: product.sku, sizes: product.sizes });
}
