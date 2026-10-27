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

const INACTIVE = ["false", "no", "0", "hide", "hidden"];

function isInactive(value: string | undefined): boolean {
  return INACTIVE.includes((value ?? "TRUE").trim().toLowerCase());
}

function firstInGroup(rows: Record<string, string>[], key: string): string {
  for (const r of rows) {
    const v = (r[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function toImage(raw: string): string {
  if (!raw) return "";
  return raw.startsWith("http") || raw.startsWith("/") ? raw : `/products/${raw}`;
}

export function rowsToProducts(rows: Record<string, string>[]): Product[] {
  const keys = new Set(Object.keys(rows[0] ?? {}));
  if (keys.has("model") && keys.has("size") && keys.has("count")) {
    return stockTakeToProducts(rows);
  }
  return catalogueRowsToProducts(rows);
}

// Stock-take layout: one row per size — columns like `COLOR,SIZE,COUNT,MODEL`
// (SIZE and COUNT/EU also accepted). Stock per size comes from the sheet; the
// built-in catalogue fills in name/price/photo/description for known MODEL
// skus. Optional sheet columns — name, price, category, photo, description,
// color, active — override the catalogue when present and non-empty. Models
// with no usable name+price (not in the catalogue and no overrides) or with
// zero stock are skipped.
function stockTakeToProducts(rows: Record<string, string>[]): Product[] {
  const bySku = new Map(PRODUCTS.map((p) => [p.sku, p]));
  const groups = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    const model = (r.model || r.sku || "").trim();
    if (!model || model.toUpperCase() === "TOTAL") continue;
    let g = groups.get(model);
    if (!g) groups.set(model, (g = []));
    g.push(r);
  }
  const products: Product[] = [];
  for (const [model, rs] of groups) {
    if (isInactive(firstInGroup(rs, "active"))) continue;
    const stock: Record<number, number> = {};
    for (const r of rs) {
      const size = parseInt((r.size || "").replace(/[^0-9]/g, ""), 10);
      const count = parseInt((r.count || r.qty || r.stock || "0").replace(/[^0-9]/g, ""), 10);
      if (size >= 35 && size <= 45 && count > 0) stock[size] = (stock[size] ?? 0) + count;
    }
    if (Object.keys(stock).length === 0) continue;
    const base = bySku.get(model);
    const name = firstInGroup(rs, "name") || base?.name || "";
    const price = parseInt((firstInGroup(rs, "price") || (base ? String(base.price) : "")).replace(/[^0-9]/g, ""), 10);
    if (!name || !price) {
      console.warn(`Sheet model ${model} skipped: no name/price in sheet or catalogue`);
      continue;
    }
    const catRaw = (firstInGroup(rs, "category") || firstInGroup(rs, "cat") || base?.cat || "matte")
      .toLowerCase().replace(/\s+/g, "-") as Category;
    const img = toImage(firstInGroup(rs, "photo") || firstInGroup(rs, "image") || firstInGroup(rs, "img"))
      || base?.img || "/products/image1.jpg";
    products.push({
      id: products.length + 1,
      sku: model,
      name,
      color: base?.color || firstInGroup(rs, "color") || firstInGroup(rs, "colour") || "",
      cat: CATEGORIES.includes(catRaw) ? catRaw : "matte",
      price,
      img,
      desc: firstInGroup(rs, "description") || firstInGroup(rs, "desc") || base?.desc || "",
      stock,
    });
  }
  return products;
}

function catalogueRowsToProducts(rows: Record<string, string>[]): Product[] {
  const products: Product[] = [];
  for (const r of rows) {
    if (isInactive(r.active)) continue;
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
    const img = toImage(r.photo || r.image || r.img || "") || "/products/image1.jpg";
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
    const res = await fetch(url, { next: { revalidate: 300, tags: ["products"] } });
    if (!res.ok) throw new Error(`Sheet fetch ${res.status}`);
    const products = rowsToProducts(parseCsv(await res.text()));
    if (products.length === 0) throw new Error("Sheet returned no valid products");
    return { products, source: "sheet" };
  } catch (err) {
    console.error("Falling back to built-in catalogue:", err);
    return { products: PRODUCTS, source: "fallback" };
  }
}
