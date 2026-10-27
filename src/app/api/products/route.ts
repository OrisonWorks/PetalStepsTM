import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProducts } from "@/lib/sheet-products";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const store = await cookies();
  const all =
    new URL(req.url).searchParams.get("all") === "1" &&
    cookieAuthed(store.get(ADMIN_COOKIE)?.value);
  const { products, source } = await getProducts(all);
  return NextResponse.json({ source, count: products.length, products });
}
