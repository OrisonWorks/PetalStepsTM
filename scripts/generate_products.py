import pathlib

# Corrected photo mapping: each photo anchors inside its own stock group in the sheet.
# Prices in ZMW (K450-K650 range given by owner), tiered by finish/type.
P = [
 # name, color, finish/cat, price, img, sku, stock {EU: qty}, desc
 ("Abstract Floral Stiletto", "Apricot Floral", "statement", 600, "image12.jpg", "18085-33", {35:1,37:1,38:1,39:1,40:2,42:1,43:1,44:1,45:1}, "Statement pointed stiletto in a painterly apricot floral print. The pair that starts conversations."),
 ("Wine Red-Bottom Stiletto", "Wine", "red-bottom", 650, "image9.jpg", "25C2-W", {38:2,39:2,40:2}, "Deep wine glossy stiletto with signature red sole. Pure occasion energy."),
 ("Camel Glossy Stiletto", "Camel", "glossy", 550, "image6.jpg", "9511-6/C", {38:2,39:2,40:1,41:2,42:2,43:2}, "Warm camel glossy pointed stiletto — your work-to-dinner essential."),
 ("Khaki Matte Stiletto", "Khaki", "matte", 520, "image1.jpg", "1363-3/B", {38:2,39:2,40:1,41:2,42:2,43:2}, "Soft khaki matte stiletto. Neutral, elegant, goes with everything."),
 ("Nude Glossy Stiletto", "Nude", "glossy", 550, "image20.jpg", "9511-6/GP", {38:1,39:2,40:2,41:2,42:2,43:2}, "Classic nude glossy stiletto that elongates every look."),
 ("Nude Pink Matte Stiletto", "Nude Pink", "matte", 520, "image15.jpg", "1363-3/P", {38:1,40:2,41:2,42:1,43:2}, "Blush nude-pink matte stiletto (BIGTREE). Soft colour, sharp point."),
 ("Black Red-Bottom Stiletto", "Black", "red-bottom", 650, "image25.jpg", "25C2-B", {38:2,39:2,40:2,41:2,42:2,43:2}, "Black glossy stiletto with signature red sole. The ultimate power heel."),
 ("Red Glossy Stiletto", "Red", "glossy", 550, "image4.jpg", "9511-6/R", {38:1,39:1,40:1,41:2,42:2,43:2}, "Bold red glossy stiletto. Wear it when you mean business."),
 ("White Pink Floral Stiletto", "White Pink Floral", "statement", 600, "image21.jpg", "18085-31", {37:1,38:1,40:2,41:1,42:1,43:1,44:1,45:1}, "White stiletto with pink rose print — literally Petal Steps."),
 ("Black Matte Stiletto", "Black", "matte", 500, "image24.jpg", "9511-17/B-BT", {38:1,39:2,40:1,41:2,42:1,43:2}, "Black matte pointed stiletto (BIGTREE). Understated and endlessly versatile."),
 ("Pink Matte Stiletto", "Pink", "matte", 500, "image3.jpg", "9511-17/P", {35:1,36:1,38:1,39:2,40:1,41:2,42:2,43:2}, "Baby-pink matte stiletto. Sweet colour, serious heel."),
 ("Yellow Matte Stiletto", "Yellow", "matte", 500, "image14.jpg", "9511-17/Y", {35:1,36:1,38:1,39:2,40:2,41:2,42:3,43:2}, "Sunshine yellow matte stiletto for colour lovers."),
 ("Blue Matte Stiletto", "Blue", "matte", 500, "image23.jpg", "9511-17/B", {35:1,36:1,38:2,40:2,41:1,42:2,43:2}, "Powder-blue matte stiletto — soft, fresh, unforgettable."),
 ("Grey Matte Stiletto", "Grey", "matte", 500, "image29.jpg", "9511-17/G", {35:1,36:1,42:1,43:1}, "Light grey matte stiletto. Only a few pairs left."),
 ("White Matte Stiletto", "White", "matte", 500, "image28.jpg", "9511-17/W", {35:1,36:1,37:1,42:1,43:1}, "Clean white matte stiletto — bridal, church and all-white looks."),
 ("Army Green Stiletto", "Army Green", "matte", 520, "image2.jpg", "886-272", {36:1,37:1,38:2,39:2,40:3,41:2,42:4}, "Army-green matte stiletto. Our best-stocked style — grab your size."),
 ("Chocolate Brown Stiletto", "Chocolate Brown", "matte", 520, "image7.jpg", "9268-77", {35:1,37:1,40:4,41:4}, "Rich chocolate-brown matte stiletto, warm and polished."),
 ("Grey Glossy Stiletto", "Grey", "glossy", 550, "image16.jpg", "H100", {41:1,42:2,43:2}, "Stone-grey glossy stiletto in extended sizes EU 41-43."),
 ("Neon Green Stiletto", "Neon Green", "glossy", 550, "image11.jpg", "886-1/G", {37:1,38:1,41:1,42:1}, "Electric neon-green glossy stiletto. Not for the shy."),
 ("Neon Yellow Stiletto", "Neon Yellow", "glossy", 550, "image18.jpg", "886-1/Y", {38:1,39:1,40:1,41:1,42:1}, "High-voltage neon yellow glossy stiletto."),
 ("Neon Orange Stiletto", "Neon Orange", "glossy", 550, "image13.jpg", "886-1/O", {38:1,40:1,41:1,42:1}, "Fiery neon-orange glossy stiletto — instant outfit lift."),
 ("Two-Tone Stiletto", "Cream & Tan", "statement", 580, "image5.jpg", "2635712", {41:1,42:1,43:2}, "Cream and tan two-tone stiletto in extended sizes EU 41-43."),
 ("Khaki Rattan Slingback", "Khaki Rattan", "matte", 480, "image17.jpg", "SB575-15", {35:2,36:1,37:1,42:1}, "Khaki rattan slingback with tan strap and mid heel. Easy elegance."),
 ("Matte Brown Stiletto", "Matte Brown", "matte", 520, "image26.jpg", "ZJ000074", {38:1,39:3,40:3,41:4}, "Matte brown/nude stiletto (NC). Well stocked in EU 39-41."),
 ("Matte Nude Kitten Heel 3\"", "Matte Nude", "matte", 450, "image8.jpg", "ZJ000893", {38:3,39:2,40:4,41:3}, "Matte nude 3-inch kitten heel — all-day comfort, office perfect."),
 ("Glossy Nude Brown Heel 4\"", "Glossy Nude Brown", "glossy", 580, "image27.jpg", "584390", {38:2,39:1,40:2,41:2,42:1,43:2}, "Glossy nude-brown 4-inch heel. Polished height with presence."),
 ("Glossy Mauve Heel 4.5\"", "Glossy Mauve", "glossy", 600, "image10.jpg", "ZJ000603", {36:1,37:1,39:1}, "Glossy mauve 4.5-inch statement heel. Only 3 pairs — be quick."),
 ("Black Matte Heel", "Black", "matte", 500, "image24.jpg", "ZJ000258", {38:1,39:1,40:2,41:2}, "Black matte heel (NC) — the dependable classic for work and church."),
 ("Nude Red-Bottom Stiletto", "Nude", "red-bottom", 650, "image22.jpg", "25C2-N", {38:2,39:2,40:2,41:1,42:2,43:2}, "Nude glossy stiletto with signature red sole. Luxury look, honest price."),
]

lines = []
lines.append('export type Category = "matte" | "glossy" | "statement" | "red-bottom";')
lines.append('')
lines.append('export interface Product {')
lines.append('  id: number; sku: string; name: string; color: string; cat: Category;')
lines.append('  price: number; img: string; desc: string; stock: Record<number, number>;')
lines.append('}')
lines.append('')
lines.append('export const totalPairs = (p: Product) => Object.values(p.stock).reduce((a, b) => a + b, 0);')
lines.append('export const availableSizes = (p: Product) => Object.keys(p.stock).map(Number).sort((a, b) => a - b);')
lines.append('')
lines.append('export const PRODUCTS: Product[] = [')
for i, (name, color, cat, price, img, sku, stock, desc) in enumerate(P, 1):
    stock_s = '{ ' + ', '.join(f'{k}: {v}' for k, v in sorted(stock.items())) + ' }'
    lines.append(f'  {{ id: {i}, sku: "{sku}", name: "{name}", color: "{color}", cat: "{cat}", price: {price}, img: "/products/{img}", desc: "{desc}", stock: {stock_s} }},')
lines.append('];')
lines.append('')
lines.append('export type Filter = "all" | Category | "low";')
lines.append('export const TOTAL_PAIRS = PRODUCTS.reduce((a, p) => a + totalPairs(p), 0);')
pathlib.Path('src/lib/products.ts').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'wrote {len(P)} products, total pairs {sum(sum(p[6].values()) for p in P)}')
