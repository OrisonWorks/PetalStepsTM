"use client";
import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/context/cart-context";
import { money, WA_DISPLAY, waLink } from "@/lib/utils";

export function CartDrawer() {
  const { items, open, setOpen, inc, dec, remove, clear, subtotal } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", location: "", courier: "Collect in store — Thompson Park, Lusaka", heard: "" });

  const checkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return toast.error("Your bag is empty — add a pair first 🌸");
    const lines = items.map((i) => `• ${i.name} — EU ${i.size} × ${i.qty} — ${money(i.price * i.qty)}`).join("\n");
    const msg = `Hi Petal Steps by Thandiwe Mwaba! 🌸 I'd like to order:\n\n${lines}\n\nTotal (delivery/courier separate): ${money(subtotal)}\n\nName: ${form.name}\nNumber: ${form.phone}\nLocation: ${form.location || "—"}\nCourier of choice: ${form.courier}${form.heard ? `\nHeard about you via: ${form.heard}` : ""}\n\nPlease confirm availability before I pay. Thank you!`;
    toast.success("Order ready! Opening WhatsApp — our only official number…");
    // Fire-and-forget interest log — never blocks or errors the checkout.
    items.forEach((i) =>
      fetch("/api/log-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: i.name, size: i.size, note: `qty ${i.qty}${form.heard ? ` · via ${form.heard}` : ""}${form.location.trim() ? ` · in ${form.location.trim().slice(0, 40)}` : ""}` }),
        keepalive: true,
      }).catch(() => {})
    );
    setTimeout(() => window.open(waLink(msg), "_blank"), 900);
    clear(); setForm({ name: "", phone: "", location: "", courier: "Collect in store — Thompson Park, Lusaka", heard: "" }); setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <div className="border-b border-rose-100 p-5">
          <SheetTitle>Your bag 🛍️</SheetTitle>
          <SheetDescription>Send your order to our official WhatsApp {WA_DISPLAY}. Confirm availability before payment.</SheetDescription>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!items.length && <p className="py-10 text-center text-stone-500">Your bag is empty.<br />Add something beautiful 🌸</p>}
          {items.map((i) => (
            <div key={i.key} className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
              <Image src={i.img} alt={i.name} width={128} height={128} className="h-16 w-16 rounded-xl object-cover" />
              <div>
                <h4 className="text-sm font-bold">{i.name}</h4>
                <p className="text-xs text-stone-500">EU size {i.size} · {money(i.price)}</p>
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
          <div className="flex justify-between border-t border-dashed border-rose-200 pt-2 text-base"><span>Total</span><strong>{money(subtotal)}</strong></div>
          <p className="text-xs text-stone-500">Delivery is separate: Lusaka — you book Yango after we confirm (Mon–Fri 10:00–16:00, Sat 09:00–13:00). Out of town — Platinum/Falcon or bus courier, cost after weighing. Pick up within 5 days or K5/day storage applies.</p>
          <Input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required placeholder="Your number (WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <select value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} className="h-11 w-full rounded-full border border-rose-200 bg-white px-4 text-sm outline-none focus:border-rose-400">
            <option>Collect in store — Thompson Park, Lusaka</option>
            <option>Lusaka — Yango rider (I will book)</option>
            <option>Out of town — Platinum courier</option>
            <option>Out of town — Falcon courier</option>
            <option>Out of town — Bus courier</option>
          </select>
          <select value={form.heard} onChange={(e) => setForm({ ...form, heard: e.target.value })} className="h-11 w-full rounded-full border border-rose-200 bg-white px-4 text-sm outline-none focus:border-rose-400">
            <option value="">How did you hear about us? (optional)</option>
            <option>Facebook</option>
            <option>Instagram</option>
            <option>TikTok</option>
            <option>WhatsApp status</option>
            <option>A friend</option>
            <option>Walk-in / saw the shop</option>
            <option>Other</option>
          </select>
          <Button type="submit" className="w-full">Send order on WhatsApp →</Button>
          <div className="rounded-2xl bg-[#fff1e6] p-3 text-xs leading-relaxed text-stone-600">
            <strong>Payment (after we confirm availability):</strong><br />Airtel 0977235607 — Daniel Mwaba · MTN 0962222926 — Sungo Siphokazi Daka · FNB eWallet on request. Add the withdrawal fee and attach proof of payment. Only pay via official number {WA_DISPLAY}.
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
