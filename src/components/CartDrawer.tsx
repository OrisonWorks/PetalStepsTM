"use client";
import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/context/cart-context";
import { DELIVERY_FEE, FB_URL, FREE_DELIVERY, money } from "@/lib/utils";

export function CartDrawer() {
  const { items, open, setOpen, inc, dec, remove, clear, subtotal } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const delivery = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE;

  const checkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return toast.error("Your bag is empty — add a pair first 🌸");
    const lines = items.map((i) => `• ${i.name} — UK ${i.size} × ${i.qty} — ${money(i.price * i.qty)}`).join("\n");
    console.log(`Hi Petal Steps by TM! 🌸 I'd like to order:\n\n${lines}\n\nSubtotal: ${money(subtotal)}\nDelivery: ${delivery === 0 ? "FREE" : money(delivery)}\nTotal: ${money(subtotal + delivery)}\n\nName: ${form.name}\nPhone: ${form.phone}\nAddress: ${form.address || "—"}`);
    toast.success("Order ready! Opening Facebook to confirm it with us…");
    setTimeout(() => window.open(FB_URL, "_blank"), 900);
    clear(); setForm({ name: "", phone: "", address: "" }); setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <div className="border-b border-rose-100 p-5">
          <SheetTitle>Your bag 🛍️</SheetTitle>
          <SheetDescription>Confirm your order — we&apos;ll finalise stock &amp; payment with you.</SheetDescription>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!items.length && <p className="py-10 text-center text-stone-500">Your bag is empty.<br />Add something beautiful 🌸</p>}
          {items.map((i) => (
            <div key={i.key} className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
              <Image src={i.img} alt={i.name} width={128} height={128} className="h-16 w-16 rounded-xl object-cover" />
              <div>
                <h4 className="text-sm font-bold">{i.name}</h4>
                <p className="text-xs text-stone-500">UK size {i.size} · {money(i.price)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <button className="flex h-6 w-6 items-center justify-center rounded-full border border-rose-200" onClick={() => dec(i.key)}><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-bold">{i.qty}</span>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full border border-rose-200" onClick={() => inc(i.key)}><Plus className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="text-right">
                <strong className="text-sm">{money(i.price * i.qty)}</strong>
                <button className="mt-1 flex items-center gap-1 text-xs font-bold text-rose-500" onClick={() => remove(i.key)}><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={checkout} className="space-y-2 border-t border-rose-100 p-5">
          <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><strong>{subtotal === 0 ? "—" : delivery === 0 ? "FREE" : money(delivery)}</strong></div>
          <div className="flex justify-between border-t border-dashed border-rose-200 pt-2 text-base"><span>Total</span><strong>{money(subtotal + delivery)}</strong></div>
          {subtotal > 0 && delivery > 0 && <p className="text-xs text-stone-500">Add {money(FREE_DELIVERY - subtotal)} more for free delivery.</p>}
          {delivery === 0 && subtotal > 0 && <p className="text-xs text-emerald-600">You unlocked free delivery 🎉</p>}
          <Input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required placeholder="Phone / WhatsApp number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Delivery address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button type="submit" className="w-full">Place order →</Button>
          <p className="text-center text-xs text-stone-500">We&apos;ll confirm your order, stock and payment details with you directly.</p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
