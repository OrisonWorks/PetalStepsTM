"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

export interface CartItem {
  key: string;
  id: number;
  name: string;
  price: number;
  img: string;
  size: number;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (p: Product, size?: number) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("petalCart") || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("petalCart", JSON.stringify(items));
  }, [items]);

  const add = useCallback((p: Product, size?: number) => {
    const s = size ?? p.sizes[Math.floor(p.sizes.length / 2)];
    const key = `${p.id}-${s}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { key, id: p.id, name: p.name, price: p.price, img: p.img, size: s, qty: 1 }];
    });
    toast.success(`Added ${p.name} (UK ${s}) to your bag 🌸`);
  }, []);

  const inc = useCallback((key: string) => setItems((p) => p.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i))), []);
  const dec = useCallback(
    (key: string) =>
      setItems((p) => p.map((i) => (i.key === key ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0)),
    []
  );
  const remove = useCallback((key: string) => setItems((p) => p.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      items, add, inc, dec, remove, clear, open, setOpen,
      count: items.reduce((a, i) => a + i.qty, 0),
      subtotal: items.reduce((a, i) => a + i.price * i.qty, 0),
    }),
    [items, add, inc, dec, remove, clear, open]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
