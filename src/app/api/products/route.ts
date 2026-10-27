import { NextResponse } from "next/server";
import { getProducts } from "@/lib/sheet-products";

export async function GET(req: Request) {
  const all = new URL(req.url).searchParams.get("all") === "1";
  const { products, source } = await getProducts(all);
  return NextResponse.json({ source, count: products.length, products });
}
