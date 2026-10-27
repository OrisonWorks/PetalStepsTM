"use client";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/ProductCard";
import { totalPairs, type Filter, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All heels" },
  { value: "matte", label: "Matte" },
  { value: "glossy", label: "Glossy" },
  { value: "statement", label: "Statement" },
  { value: "red-bottom", label: "Red Bottom" },
  { value: "low", label: "Almost gone" },
];

export function Shop({ products, filter, setFilter, search, sort, setSort, onQuick }: {
  products: Product[]; filter: Filter; setFilter: (f: Filter) => void; search: string;
  sort: string; setSort: (v: string) => void; onQuick: (p: Product) => void;
}) {
  const totalPairsAll = products.reduce((a, p) => a + totalPairs(p), 0);
  const list = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = products.filter((p) =>
      (filter === "all" || p.cat === filter || (filter === "low" && totalPairs(p) <= 5)) &&
      (`${p.name} ${p.color} ${p.sku}`.toLowerCase().includes(q))
    );
    if (sort === "low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, filter, search, sort]);

  return (
    <section id="shop" className="mx-auto w-[min(1180px,92%)] pb-16">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <Badge variant="soft" className="mb-3">The heels collection · Lusaka</Badge>
        <h2 className="font-display text-4xl font-semibold">Shop Petal Steps</h2>
        <p className="mt-2 text-stone-500">{products.length} styles · {totalPairsAll} pairs · K450–K650. Tap a heel to see EU sizes in stock, then add it to your bag.</p>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)} className={cn(filter === f.value && "pointer-events-none")}>
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Sort: Featured</SelectItem>
            <SelectItem value="low">Price: Low to high</SelectItem>
            <SelectItem value="high">Price: High to low</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {list.length === 0 ? (
        <p className="py-10 text-center text-stone-500">No shoes match your search. Try another keyword or category.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} product={p} onQuick={onQuick} />)}
        </div>
      )}
    </section>
  );
}
