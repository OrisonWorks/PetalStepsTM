// Shared validation + writer call for creating a brand-new style on the
// sheet. Used by the single-create and bulk-create admin routes.

export type NewProductInput = {
  sku?: unknown;
  name?: unknown;
  color?: unknown;
  price?: unknown;
  cat?: unknown;
  img?: unknown;
  desc?: unknown;
  sizes?: unknown;
};

export type NewProduct = {
  sku: string;
  fields: {
    name: string;
    price: string;
    category: string;
    colour: string;
    photo: string;
    description: string;
  };
  sizes: { size: number; count: number }[];
};

export function validateNewProduct(body: NewProductInput): NewProduct | { error: string } {
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(sku)) {
    return { error: `${sku || "?"}: style code must be 2-30 letters, digits, - or _` };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { error: `${sku}: name required` };
  }
  // Accept only unsigned integer ZMW — "-450" would lose its sign and
  // "450.50" would come back through the parser as 45050.
  const priceRaw = String(body.price || "").trim();
  if (!/^\d{1,7}$/.test(priceRaw) || !(parseInt(priceRaw, 10) > 0)) {
    return { error: `${sku}: price must be a positive whole number` };
  }
  // Parser only tracks EU 35–45; accepting outside sizes would create a
  // style the shop can never show.
  const sizes = (Array.isArray(body.sizes) ? body.sizes : [])
    .map((s: { size?: unknown; count?: unknown }) => ({
      size: parseInt(String(s && s.size), 10),
      count: Math.max(0, parseInt(String(s && s.count), 10) || 0),
    }))
    .filter((s: { size: number; count: number }) => s.size >= 35 && s.size <= 45 && s.count > 0);
  if (sizes.length === 0) {
    return { error: `${sku}: add stock for at least one size` };
  }
  return {
    sku,
    fields: {
      name,
      price: String(parseInt(priceRaw, 10)),
      category: String(body.cat || "").slice(0, 30),
      colour: String(body.color || "").slice(0, 40),
      photo: String(body.img || "").slice(0, 500),
      description: String(body.desc || "").slice(0, 500),
    },
    sizes,
  };
}

export async function writerCreateProduct(
  url: string,
  token: string,
  p: NewProduct
): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        action: "createProduct",
        model: p.sku,
        fields: p.fields,
        sizes: p.sizes,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { error: data.error || `Stock writer ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { error: `Stock writer unreachable: ${err}` };
  }
}
