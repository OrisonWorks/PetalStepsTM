import csv, pathlib, re

src = pathlib.Path("src/lib/products.ts").read_text(encoding="utf-8")
sizes = list(range(35, 46))
rows = []
for m in re.finditer(r'sku: "([^"]+)", name: "([^"]+)", color: "([^"]+)", cat: "([^"]+)", price: (\d+), img: "([^"]+)", desc: "([^"]+)", stock: \{([^}]+)\}', src):
    sku, name, color, cat, price, img, desc, stock_raw = m.groups()
    stock = {int(k): int(v) for k, v in re.findall(r"(\d+):\s*(\d+)", stock_raw)}
    row = {
        "sku": sku, "name": name, "color": color, "category": cat,
        "price": price, "photo": pathlib.Path(img).name,
        "description": desc, "active": "TRUE",
    }
    for s in sizes:
        row[f"stock_{s}"] = stock.get(s, 0)
    rows.append(row)

fields = ["sku", "name", "color", "category", "price", "photo", "description", "active"] + [f"stock_{s}" for s in sizes]
out = pathlib.Path("petal-steps-products.csv")
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(rows)
print(f"Wrote {len(rows)} products to {out}")
