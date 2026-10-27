export type Category = "matte" | "glossy" | "statement" | "red-bottom";

export interface Product {
  id: number; sku: string; name: string; color: string; cat: Category;
  price: number; img: string; desc: string; stock: Record<number, number>;
}

export const totalPairs = (p: Product) => Object.values(p.stock).reduce((a, b) => a + b, 0);
export const availableSizes = (p: Product) => Object.keys(p.stock).map(Number).sort((a, b) => a - b);

export const PRODUCTS: Product[] = [
  { id: 1, sku: "18085-33", name: "Abstract Floral Stiletto", color: "Apricot Floral", cat: "statement", price: 600, img: "/products/image12.jpg", desc: "Statement pointed stiletto in a painterly apricot floral print. The pair that starts conversations.", stock: { 35: 1, 37: 1, 38: 1, 39: 1, 40: 2, 42: 1, 43: 1, 44: 1, 45: 1 } },
  { id: 2, sku: "25C2-W", name: "Wine Red-Bottom Stiletto", color: "Wine", cat: "red-bottom", price: 650, img: "/products/image9.jpg", desc: "Deep wine glossy stiletto with signature red sole. Pure occasion energy.", stock: { 38: 2, 39: 2, 40: 2 } },
  { id: 3, sku: "9511-6/C", name: "Camel Glossy Stiletto", color: "Camel", cat: "glossy", price: 550, img: "/products/image6.jpg", desc: "Warm camel glossy pointed stiletto — your work-to-dinner essential.", stock: { 38: 2, 39: 2, 40: 1, 41: 2, 42: 2, 43: 2 } },
  { id: 4, sku: "1363-3/B", name: "Khaki Matte Stiletto", color: "Khaki", cat: "matte", price: 520, img: "/products/image1.jpg", desc: "Soft khaki matte stiletto. Neutral, elegant, goes with everything.", stock: { 38: 2, 39: 2, 40: 1, 41: 2, 42: 2, 43: 2 } },
  { id: 5, sku: "9511-6/GP", name: "Nude Glossy Stiletto", color: "Nude", cat: "glossy", price: 550, img: "/products/image20.jpg", desc: "Classic nude glossy stiletto that elongates every look.", stock: { 38: 1, 39: 2, 40: 2, 41: 2, 42: 2, 43: 2 } },
  { id: 6, sku: "1363-3/P", name: "Nude Pink Matte Stiletto", color: "Nude Pink", cat: "matte", price: 520, img: "/products/image15.jpg", desc: "Blush nude-pink matte stiletto (BIGTREE). Soft colour, sharp point.", stock: { 38: 1, 40: 2, 41: 2, 42: 1, 43: 2 } },
  { id: 7, sku: "25C2-B", name: "Black Red-Bottom Stiletto", color: "Black", cat: "red-bottom", price: 650, img: "/products/image25.jpg", desc: "Black glossy stiletto with signature red sole. The ultimate power heel.", stock: { 38: 2, 39: 2, 40: 2, 41: 2, 42: 2, 43: 2 } },
  { id: 8, sku: "9511-6/R", name: "Red Glossy Stiletto", color: "Red", cat: "glossy", price: 550, img: "/products/image4.jpg", desc: "Bold red glossy stiletto. Wear it when you mean business.", stock: { 38: 1, 39: 1, 40: 1, 41: 2, 42: 2, 43: 2 } },
  { id: 9, sku: "18085-31", name: "White Pink Floral Stiletto", color: "White Pink Floral", cat: "statement", price: 600, img: "/products/image21.jpg", desc: "White stiletto with pink rose print — literally Petal Steps.", stock: { 37: 1, 38: 1, 40: 2, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1 } },
  { id: 10, sku: "9511-17/B-BT", name: "Black Matte Stiletto", color: "Black", cat: "matte", price: 500, img: "/products/image24.jpg", desc: "Black matte pointed stiletto (BIGTREE). Understated and endlessly versatile.", stock: { 38: 1, 39: 2, 40: 1, 41: 2, 42: 1, 43: 2 } },
  { id: 11, sku: "9511-17/P", name: "Pink Matte Stiletto", color: "Pink", cat: "matte", price: 500, img: "/products/image3.jpg", desc: "Baby-pink matte stiletto. Sweet colour, serious heel.", stock: { 35: 1, 36: 1, 38: 1, 39: 2, 40: 1, 41: 2, 42: 2, 43: 2 } },
  { id: 12, sku: "9511-17/Y", name: "Yellow Matte Stiletto", color: "Yellow", cat: "matte", price: 500, img: "/products/image14.jpg", desc: "Sunshine yellow matte stiletto for colour lovers.", stock: { 35: 1, 36: 1, 38: 1, 39: 2, 40: 2, 41: 2, 42: 3, 43: 2 } },
  { id: 13, sku: "9511-17/B", name: "Blue Matte Stiletto", color: "Blue", cat: "matte", price: 500, img: "/products/image23.jpg", desc: "Powder-blue matte stiletto — soft, fresh, unforgettable.", stock: { 35: 1, 36: 1, 38: 2, 40: 2, 41: 1, 42: 2, 43: 2 } },
  { id: 14, sku: "9511-17/G", name: "Grey Matte Stiletto", color: "Grey", cat: "matte", price: 500, img: "/products/image29.jpg", desc: "Light grey matte stiletto. Only a few pairs left.", stock: { 35: 1, 36: 1, 42: 1, 43: 1 } },
  { id: 15, sku: "9511-17/W", name: "White Matte Stiletto", color: "White", cat: "matte", price: 500, img: "/products/image28.jpg", desc: "Clean white matte stiletto — bridal, church and all-white looks.", stock: { 35: 1, 36: 1, 37: 1, 42: 1, 43: 1 } },
  { id: 16, sku: "886-272", name: "Army Green Stiletto", color: "Army Green", cat: "matte", price: 520, img: "/products/image2.jpg", desc: "Army-green matte stiletto. Our best-stocked style — grab your size.", stock: { 36: 1, 37: 1, 38: 2, 39: 2, 40: 3, 41: 2, 42: 4 } },
  { id: 17, sku: "9268-77", name: "Chocolate Brown Stiletto", color: "Chocolate Brown", cat: "matte", price: 520, img: "/products/image7.jpg", desc: "Rich chocolate-brown matte stiletto, warm and polished.", stock: { 35: 1, 37: 1, 40: 4, 41: 4 } },
  { id: 18, sku: "H100", name: "Grey Glossy Stiletto", color: "Grey", cat: "glossy", price: 550, img: "/products/image16.jpg", desc: "Stone-grey glossy stiletto in extended sizes EU 41-43.", stock: { 41: 1, 42: 2, 43: 2 } },
  { id: 19, sku: "886-1/G", name: "Neon Green Stiletto", color: "Neon Green", cat: "glossy", price: 550, img: "/products/image11.jpg", desc: "Electric neon-green glossy stiletto. Not for the shy.", stock: { 37: 1, 38: 1, 41: 1, 42: 1 } },
  { id: 20, sku: "886-1/Y", name: "Neon Yellow Stiletto", color: "Neon Yellow", cat: "glossy", price: 550, img: "/products/image18.jpg", desc: "High-voltage neon yellow glossy stiletto.", stock: { 38: 1, 39: 1, 40: 1, 41: 1, 42: 1 } },
  { id: 21, sku: "886-1/O", name: "Neon Orange Stiletto", color: "Neon Orange", cat: "glossy", price: 550, img: "/products/image13.jpg", desc: "Fiery neon-orange glossy stiletto — instant outfit lift.", stock: { 38: 1, 40: 1, 41: 1, 42: 1 } },
  { id: 22, sku: "2635712", name: "Two-Tone Stiletto", color: "Cream & Tan", cat: "statement", price: 580, img: "/products/image5.jpg", desc: "Cream and tan two-tone stiletto in extended sizes EU 41-43.", stock: { 41: 1, 42: 1, 43: 2 } },
  { id: 23, sku: "SB575-15", name: "Khaki Rattan Slingback", color: "Khaki Rattan", cat: "matte", price: 480, img: "/products/image17.jpg", desc: "Khaki rattan slingback with tan strap and mid heel. Easy elegance.", stock: { 35: 2, 36: 1, 37: 1, 42: 1 } },
  { id: 24, sku: "ZJ000074", name: "Matte Brown Stiletto", color: "Matte Brown", cat: "matte", price: 520, img: "/products/image26.jpg", desc: "Matte brown/nude stiletto (NC). Well stocked in EU 39-41.", stock: { 38: 1, 39: 3, 40: 3, 41: 4 } },
  { id: 25, sku: "ZJ000893", name: "Matte Nude Kitten Heel 3-inch", color: "Matte Nude", cat: "matte", price: 450, img: "/products/image8.jpg", desc: "Matte nude 3-inch kitten heel — all-day comfort, office perfect.", stock: { 38: 3, 39: 2, 40: 4, 41: 3 } },
  { id: 26, sku: "584390", name: "Glossy Nude Brown Heel 4-inch", color: "Glossy Nude Brown", cat: "glossy", price: 580, img: "/products/image27.jpg", desc: "Glossy nude-brown 4-inch heel. Polished height with presence.", stock: { 38: 2, 39: 1, 40: 2, 41: 2, 42: 1, 43: 2 } },
  { id: 27, sku: "ZJ000603", name: "Glossy Mauve Heel 4.5-inch", color: "Glossy Mauve", cat: "glossy", price: 600, img: "/products/image10.jpg", desc: "Glossy mauve 4.5-inch statement heel. Only 3 pairs — be quick.", stock: { 36: 1, 37: 1, 39: 1 } },
  { id: 28, sku: "ZJ000258", name: "Black Matte Heel", color: "Black", cat: "matte", price: 500, img: "/products/image24.jpg", desc: "Black matte heel (NC) — the dependable classic for work and church.", stock: { 38: 1, 39: 1, 40: 2, 41: 2 } },
  { id: 29, sku: "25C2-N", name: "Nude Red-Bottom Stiletto", color: "Nude", cat: "red-bottom", price: 650, img: "/products/image22.jpg", desc: "Nude glossy stiletto with signature red sole. Luxury look, honest price.", stock: { 38: 2, 39: 2, 40: 2, 41: 1, 42: 2, 43: 2 } },
];

export type Filter = "all" | Category | "low";
export const TOTAL_PAIRS = PRODUCTS.reduce((a, p) => a + totalPairs(p), 0);
