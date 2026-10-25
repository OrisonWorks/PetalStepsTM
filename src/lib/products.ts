export type Category = "women" | "men" | "kids";

export interface Product {
  id: number;
  name: string;
  cat: Category;
  price: number;
  was: number | null;
  badge: "sale" | "new" | null;
  img: string;
  desc: string;
  sizes: number[];
}

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=700&q=80&auto=format&fit=crop`;

export const PRODUCTS: Product[] = [
  { id: 1, name: "Bloom Runner Sneakers", cat: "women", price: 899, was: 1199, badge: "sale", img: img("photo-1542291026-7eec264c27ff"), desc: "Lightweight knit runners with cushioned petal-soft soles. Your everyday go-to.", sizes: [3, 4, 5, 6, 7, 8] },
  { id: 2, name: "Petal Point Heels", cat: "women", price: 749, was: null, badge: "new", img: img("photo-1543163521-1bf539c55dd2"), desc: "Elegant pointed heels with padded insole — glamour without the ache.", sizes: [3, 4, 5, 6, 7, 8] },
  { id: 3, name: "Rose Strappy Sandals", cat: "women", price: 499, was: 649, badge: "sale", img: img("photo-1603487742131-4160ec999306"), desc: "Breezy strappy sandals that go with everything from dresses to denim.", sizes: [3, 4, 5, 6, 7, 8] },
  { id: 4, name: "Blush Ballet Flats", cat: "women", price: 549, was: null, badge: null, img: img("photo-1525966222134-fcfa99b8ae77"), desc: "Soft ballet flats with flexible sole and bow detail. Pretty and practical.", sizes: [3, 4, 5, 6, 7, 8] },
  { id: 5, name: "Classic White Sneakers", cat: "women", price: 799, was: null, badge: null, img: img("photo-1560769629-975ec94e6a86"), desc: "Clean, minimal sneakers that finish any outfit. A wardrobe essential.", sizes: [3, 4, 5, 6, 7, 8, 9] },
  { id: 6, name: "Urban Street Sneakers", cat: "men", price: 999, was: 1299, badge: "sale", img: img("photo-1614252369475-531eba835eb1"), desc: "Bold street-style sneakers with superior grip and all-day cushioning.", sizes: [6, 7, 8, 9, 10, 11, 12] },
  { id: 7, name: "Suede Chelsea Boots", cat: "men", price: 1299, was: null, badge: "new", img: img("photo-1638247025967-b4e38f787b76"), desc: "Smart suede Chelsea boots — dress them up or down, they always deliver.", sizes: [6, 7, 8, 9, 10, 11] },
  { id: 8, name: "Everyday Loafers", cat: "men", price: 849, was: null, badge: null, img: img("photo-1533867617858-e7b97e060509"), desc: "Slip-on loafers in soft finish. Office-ready comfort, zero effort.", sizes: [6, 7, 8, 9, 10, 11, 12] },
  { id: 9, name: "Trail Adventure Shoes", cat: "men", price: 1099, was: 1399, badge: "sale", img: img("photo-1606107557195-0e29a4b5b4aa"), desc: "Rugged trail shoes with reinforced toe and breathable mesh upper.", sizes: [6, 7, 8, 9, 10, 11, 12] },
  { id: 10, name: "Kids Sparkle Sneakers", cat: "kids", price: 449, was: null, badge: "new", img: img("photo-1514989940723-e8e51635b782"), desc: "Sparkle sneakers kids love, with easy velcro straps for parents.", sizes: [8, 9, 10, 11, 12, 13, 1, 2] },
  { id: 11, name: "Kids Everyday Runners", cat: "kids", price: 399, was: 499, badge: "sale", img: img("photo-1565271371485-5f8e5a8e5c8f"), desc: "Tough, comfy runners built for playgrounds, school and everything between.", sizes: [8, 9, 10, 11, 12, 13, 1, 2] },
  { id: 12, name: "Kids Summer Sandals", cat: "kids", price: 299, was: null, badge: null, img: img("photo-1607453998774-d533f65dac99"), desc: "Quick-dry summer sandals with adjustable straps and non-slip soles.", sizes: [8, 9, 10, 11, 12, 13, 1] },
];

export type Filter = "all" | Category | "sale";
