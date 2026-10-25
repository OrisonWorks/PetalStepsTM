"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/context/cart-context";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/products";

export function ProductCard({ product, onQuick }: { product: Product; onQuick: (p: Product) => void }) {
  const { add } = useCart();
  const discount = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;
  return (
    <Card className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10">
      <div className="relative cursor-pointer" onClick={() => onQuick(product)}>
        <Image src={product.img} alt={product.name} width={700} height={460} className="h-[230px] w-full object-cover max-sm:h-40" />
        {product.badge === "sale" && <Badge className="absolute left-3 top-3">Sale −{discount}%</Badge>}
        {product.badge === "new" && <Badge variant="new" className="absolute left-3 top-3">New</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">{product.cat}</span>
        <h3 className="font-display cursor-pointer text-lg font-semibold hover:text-rose-500" onClick={() => onQuick(product)}>{product.name}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <strong className="text-lg text-rose-600">{money(product.price)}</strong>
          {product.was && <s className="text-sm text-stone-400">{money(product.was)}</s>}
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => add(product)}>Add to bag</Button>
          <Button size="sm" variant="secondary" onClick={() => onQuick(product)}>View</Button>
        </div>
      </div>
    </Card>
  );
}
