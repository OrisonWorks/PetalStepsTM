"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/context/cart-context";
import { cn, money } from "@/lib/utils";
import type { Product } from "@/lib/products";

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { add, setOpen } = useCart();
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => setSize(null), [product]);

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 sm:grid-cols-2">
        {product && (
          <>
            <Image src={product.img} alt={product.name} width={700} height={700} className="h-60 w-full object-cover sm:h-full sm:min-h-[380px]" />
            <div className="flex flex-col gap-3 p-6">
              <Badge variant="soft" className="self-start">{product.cat}{product.badge ? ` · ${product.badge}` : ""}</Badge>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>{product.desc}</DialogDescription>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl text-rose-600">{money(product.price)}</strong>
                {product.was && <s className="text-stone-400">{money(product.was)}</s>}
              </div>
              <p className="mt-1 text-sm font-bold">Select size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={cn("min-w-12 rounded-xl border px-3 py-2 font-semibold", size === s ? "border-rose-500 bg-rose-500 text-white" : "border-rose-200 bg-white hover:border-rose-400")}>
                    UK {s}
                  </button>
                ))}
              </div>
              <Button className="mt-3 w-full" onClick={() => {
                if (!size) return toast.error("Please select a size first 👟");
                add(product, size); onClose(); setOpen(true);
              }}>Add to bag</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
