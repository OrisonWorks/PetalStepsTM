import { PRODUCTS, type Category, type Product } from "@/lib/products";

const CATEGORIES: Category[] = ["matte", "glossy", "statement", "red-bottom"];
const SIZES = Array.from({ length: 11 }, (_, i) => 35 + i);

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => { out[h] = (cells[i] ?? "").trim(); });
    return out;
  });
}

export function rowsToProducts(rows: Record<string, string>[]): Product[] {
  const products: Product[] = [];
  for (const r of rows) {
    const activeRaw = (r.active ?? "TRUE").toLowerCase();
    if (["false", "no", "0", "hide", "hidden"].includes(activeRaw)) continue;
    const sku = r.sku || r.model || "";
    const name = r.name || "";
    const price = parseInt((r.price || "").replace(/[^0-9]/g, ""), 10);
    if (!sku || !name || !price) continue;
    const stock: Record<number, number> = {};
    for (const s of SIZES) {
      const v = parseInt(r[`stock_${s}`] || r[`eu_${s}`] || r[`size_${s}`] || "0", 10);
      if (v > 0) stock[s] = v;
    }
    if (Object.keys(stock).length === 0) continue;
    const catRaw = (r.category || r.cat || "matte").toLowerCase().replace(/\s+/g, "-") as Category;
    const photoRaw = r.photo || r.image || r.img || "";
    const img = !photoRaw
      ? "/products/image1.jpg"
      : photoRaw.startsWith("http") || photoRaw.startsWith("/")
        ? photoRaw
        : `/products/${photoRaw}`;
    products.push({
      id: products.length + 1,
      sku,
      name,
      color: r.color || r.colour || "",
      cat: CATEGORIES.includes(catRaw) ? catRaw : "matte",
      price,
      img,
      desc: r.description || r.desc || "",
      stock,
    });
  }
  return products;
}

export async function getProducts(): Promise<{ products: Product[]; source: "sheet" | "fallback" }> {
  const url = process.env.PRODUCTS_SHEET_CSV_URL;
  if (!url) return { products: PRODUCTS, source: "fallback" };
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Sheet fetch ${res.status}`);
    const products = rowsToProducts(parseCsv(await res.text()));
    if (products.length === 0) throw new Error("Sheet returned no valid products");
    return { products, source: "sheet" };
  } catch (err) {
    console.error("Falling back to built-in catalogue:", err);
    return { products: PRODUCTS, source: "fallback" };
  }
}
