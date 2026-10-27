import { NextResponse } from "next/server";
import { getProducts } from "@/lib/sheet-products";

export const revalidate = 300;

export async function GET() {
  const { products, source } = await getProducts();
  return NextResponse.json({ source, count: products.length, products });
}
