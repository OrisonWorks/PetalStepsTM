"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/context/cart-context";
import { cn, money } from "@/lib/utils";
import { totalPairs, type Product } from "@/lib/products";

const CAT_LABEL: Record<Product["cat"], string> = { matte: "Matte", glossy: "Glossy", statement: "Statement", "red-bottom": "Red Bottom" };

export function ProductCard({ product, onQuick }: { product: Product; onQuick: (p: Product) => void }) {
  const { add } = useCart();
  const pairs = totalPairs(product);
  return (
    <Card className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10">
      <div className="relative cursor-pointer animate-pulse bg-rose-50" onClick={() => onQuick(product)}>
        <Image src={product.img} alt={product.name} width={700} height={860} sizes="(max-width: 1024px) 50vw, 25vw" className="h-[280px] w-full object-cover max-sm:h-52" />
        {pairs <= 5 && <Badge className="absolute left-3 top-3">Only a few left</Badge>}
        {product.cat === "red-bottom" && <Badge variant="new" className="absolute right-3 top-3">Red Bottom</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">{CAT_LABEL[product.cat]} · {product.color}</span>
        <h3 className="font-display cursor-pointer text-lg font-semibold leading-snug hover:text-rose-500" onClick={() => onQuick(product)}>{product.name}</h3>
        <div className="flex flex-wrap gap-1" title="EU sizes in stock">
          {[35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map((s) => (
            <span
              key={s}
              className={cn(
                "w-6 rounded-md border py-0.5 text-center text-[9px] font-bold",
                (product.stock[s] ?? 0) > 0 ? "border-rose-300 bg-rose-50 text-rose-600" : "border-stone-100 bg-stone-50 text-stone-300"
              )}
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-stone-500">In stock</p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <strong className="text-lg text-rose-600">{money(product.price)}</strong>
          <span className="text-xs text-stone-400">ZMW</span>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => add(product)}>Add to bag</Button>
          <Button size="sm" variant="secondary" onClick={() => onQuick(product)}>Sizes</Button>
        </div>
      </div>
    </Card>
  );
}
