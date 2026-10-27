"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { BadgeCheck, Clock, Facebook, MapPin, MessageCircle, PiggyBank, ShieldCheck, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PromoPlayer } from "@/components/PromoPlayer";
import { FB_URL, SHOP_ADDRESS, WA_DISPLAY, waLink } from "@/lib/utils";
import type { Filter } from "@/lib/products";

const CATS: { filter: Filter; label: string; sub: string; img: string }[] = [
  { filter: "matte", label: "Matte Heels", sub: "Soft finish · work, church & daily polish", img: "/products/image3.jpg" },
  { filter: "glossy", label: "Glossy Heels", sub: "High shine · camel, nude, red & neon", img: "/products/image6.jpg" },
  { filter: "statement", label: "Statement", sub: "Floral & two-tone show-stoppers", img: "/products/image21.jpg" },
  { filter: "red-bottom", label: "Red Bottom", sub: "Signature red sole · K650", img: "/products/image25.jpg" },
];

export function Hero() {
  return (
    <section id="top" className="bg-gradient-to-br from-[#fde8d7] via-[#fff7f1] to-[#f3e8ff] py-14">
      <div className="mx-auto grid w-[min(1180px,92%)] items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="font-script text-5xl leading-none text-stone-900">Petal Steps</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.35em] text-stone-500">By Thandiwe Mwaba</p>
          <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.05] sm:text-6xl">Women&apos;s heels that <span className="italic text-rose-500">bloom</span> with every step.</h1>
          <p className="mt-5 max-w-lg text-lg text-stone-600">29 heel styles in stock in Lusaka — matte, glossy, statement florals and signature red bottoms. EU 35–45, K450–K650. What you see is what&apos;s actually on the shelf.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild><a href="#shop">Shop heels — K450–K650</a></Button>
            <Button size="lg" variant="outline" asChild><a href={waLink("Hi Petal Steps by Thandiwe Mwaba! I'd like to check heel availability.")} target="_blank" rel="noreferrer">WhatsApp {WA_DISPLAY}</a></Button>
          </div>
          <div className="mt-9 flex gap-8">
            {[["29", "Styles in stock"], ["247", "Pairs available"], ["EU 35–45", "Sizes"]].map(([n, l]) => (
              <div key={l}><strong className="font-display block text-2xl">{n}</strong><span className="text-xs text-stone-500">{l}</span></div>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-stone-600"><MapPin className="h-4 w-4 text-rose-500" /> {SHOP_ADDRESS}</p>
        </div>
        <div>
          <PromoPlayer />
          <p className="mt-3 text-center text-xs text-stone-500">Our heels, your next step. Order only on {WA_DISPLAY}.</p>
        </div>
      </div>
    </section>
  );
}

export function Marquee() {
  const text = "Women's heels K450–K650 ✦ EU 35–45 ✦ Lusaka: book Yango for collection ✦ Out of town: Platinum & Falcon courier ✦ Official number +260 760 732 751 ✦ ";
  return (
    <div className="overflow-hidden whitespace-nowrap bg-stone-900 py-2.5 text-sm font-semibold text-rose-200">
      <div className="animate-marquee inline-flex"><span className="pr-4">{text.repeat(2)}</span><span className="pr-4">{text.repeat(2)}</span></div>
    </div>
  );
}

export function Categories({ onSelect }: { onSelect: (f: Filter) => void }) {
  return (
    <section id="categories" className="mx-auto w-[min(1180px,92%)] py-16">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <Badge variant="soft" className="mb-3">Shop by finish</Badge>
        <h2 className="font-display text-4xl font-semibold">Find your perfect pair</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CATS.map((c) => (
          <button key={c.label} onClick={() => onSelect(c.filter)} className="group overflow-hidden rounded-2xl border border-rose-100 bg-white text-left transition hover:-translate-y-1 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10">
            <Image src={c.img} alt={c.label} width={700} height={340} className="h-40 w-full object-cover transition group-hover:scale-105" />
            <span className="font-display block px-4 pt-3 text-xl font-semibold">{c.label}</span>
            <small className="block px-4 pb-4 text-stone-500">{c.sub}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SaleBanner({ onSelect }: { onSelect: (f: Filter) => void }) {
  return (
    <section className="bg-gradient-to-r from-[#c084fc] via-rose-400 to-[#fda4af] py-12 text-white">
      <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap items-center justify-between gap-6">
        <div>
          <Badge className="mb-3 bg-white/20 text-white">Grand opening · 24 October 2026 · 09:00–13:00</Badge>
          <h2 className="font-display text-4xl font-semibold">Come celebrate with us in Thompson Park</h2>
          <p className="mt-1 text-rose-50">{SHOP_ADDRESS}. Almost-gone styles have 5 pairs or fewer — grab your EU size before it sells out.</p>
        </div>
        <Button variant="light" size="lg" onClick={() => onSelect("low")}>Shop almost-gone heels</Button>
      </div>
    </section>
  );
}

const WHY = [
  { icon: BadgeCheck, title: "Real stock, real sizes", text: "Every style shows the EU sizes actually in stock and how many pairs are left. No guessing." },
  { icon: PiggyBank, title: "Honest Kwacha prices", text: "All heels K450–K650. Kitten heels to signature red bottoms — the price is on the pair." },
  { icon: Truck, title: "Lusaka & out-of-town delivery", text: "Lusaka: you book Yango for collection. Out of town: Platinum & Falcon courier or bus courier, cost confirmed after weighing." },
  { icon: ShieldCheck, title: "Order safely", text: "Only order and pay via our official number +260 760 732 751. Confirm availability before payment and attach proof of payment." },
];

export function WhyUs() {
  return (
    <section id="why" className="mx-auto w-[min(1180px,92%)] py-16">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <Badge variant="soft" className="mb-3">Why Petal Steps</Badge>
        <h2 className="font-display text-4xl font-semibold">Heels, honestly sold</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((w) => (
          <Card key={w.title}><CardContent className="pt-6">
            <w.icon className="h-8 w-8 text-rose-500" />
            <h3 className="font-display mt-3 text-lg font-semibold">{w.title}</h3>
            <p className="mt-1 text-sm text-stone-500">{w.text}</p>
          </CardContent></Card>
        ))}
      </div>
    </section>
  );
}

const REVIEWS = [
  { text: "The photos are the actual heels — my nude glossy pair looked exactly the same in person. EU sizing was spot on.", name: "Lusaka customer" },
  { text: "Ordered on WhatsApp, confirmed my size, and sent a Yango rider the same afternoon. So easy.", name: "Lusaka customer" },
  { text: "Red bottoms at K650? I checked the official number first, paid by mobile money and collected in Thompson Park.", name: "Lusaka customer" },
];

export function Reviews() {
  return (
    <section id="reviews" className="mx-auto w-[min(1180px,92%)] pb-16">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <Badge variant="soft" className="mb-3">Customer love</Badge>
        <h2 className="font-display text-4xl font-semibold">What our customers say</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <Card key={r.name}><CardContent className="pt-6">
            <div className="flex gap-0.5 text-amber-500">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <blockquote className="mt-3 text-stone-600">“{r.text}”</blockquote>
            <figcaption className="mt-3 font-bold">— {r.name}</figcaption>
          </CardContent></Card>
        ))}
      </div>
    </section>
  );
}

export function Contact() {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    toast.success("Opening WhatsApp — the only official Petal Steps number 🌸");
    setTimeout(() => window.open(waLink("Hi Petal Steps by Thandiwe Mwaba! I have a question about your heels."), "_blank"), 900);
    (e.target as HTMLFormElement).reset();
  };
  return (
    <section id="contact" className="mx-auto w-[min(1180px,92%)] pb-16">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <Badge variant="soft" className="mb-3">Get in touch</Badge>
          <h2 className="font-display text-4xl font-semibold">Questions? Let&apos;s talk heels.</h2>
          <p className="mt-3 text-stone-500">WhatsApp is fastest for stock checks and size advice. Please confirm availability before purchase, then attach proof of payment after you pay.</p>
          <ul className="mt-6 space-y-3 font-semibold">
            <li className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-rose-500" /><a className="text-rose-600 underline" href={waLink("Hi Petal Steps by Thandiwe Mwaba!")} target="_blank" rel="noreferrer">WhatsApp / call {WA_DISPLAY} (official number only)</a></li>
            <li className="flex items-center gap-2"><Facebook className="h-5 w-5 text-rose-500" /><a className="text-rose-600 underline" href={FB_URL} target="_blank" rel="noreferrer">Petal Steps by Thandiwe Mwaba on Facebook</a></li>
            <li className="flex items-center gap-2"><MapPin className="h-5 w-5 text-rose-500" /> {SHOP_ADDRESS}</li>
            <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-rose-500" /> Yango booking: Mon–Fri 10:00–16:00 · Sat 09:00–13:00 · Sun closed</li>
            <li className="flex items-center gap-2"><Truck className="h-5 w-5 text-rose-500" /> Pick up within 5 days, or K5/day storage applies</li>
          </ul>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {["/brand/order-payment.jpg", "/brand/delivery-lusaka.jpg", "/brand/delivery-out-of-town.jpg"].map((src) => <Image key={src} src={src} alt="Petal Steps order and delivery information" width={300} height={380} className="h-36 w-full rounded-xl object-cover object-top" />)}
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-500/10">
          <label className="block text-sm font-semibold">Your name<Input required placeholder="e.g. Tumelo M." className="mt-1" /></label>
          <label className="block text-sm font-semibold">Phone / WhatsApp<Input required placeholder="e.g. 071 234 5678" className="mt-1" /></label>
          <label className="block text-sm font-semibold">Message<textarea required rows={4} placeholder="Hi! Do you have the Pink Matte Stiletto in EU 39?" className="mt-1 w-full rounded-xl border border-rose-200 px-4 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" /></label>
          <Button type="submit" className="w-full">Send via WhatsApp →</Button>
        </form>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <section className="bg-rose-100/70 py-12">
      <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl font-semibold">Join the Petal List 🌸</h2>
          <p className="text-stone-500">First dibs on new heel drops, restocks and almost-gone sizes.</p>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); toast.success("Welcome to the Petal List 🌸 You're subscribed!"); setEmail(""); }}>
          <Input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-64 rounded-full" />
          <Button type="submit">Subscribe</Button>
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-stone-900 text-rose-100">
      <div className="mx-auto grid w-[min(1180px,92%)] gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-script text-3xl text-white">Petal Steps</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-300">By Thandiwe Mwaba</p>
          <p className="mt-2 max-w-xs text-sm text-rose-200/70">Women&apos;s heels that bloom with every step. Lusaka, Zambia.</p>
        </div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Shop</h4>{[["All heels", "#shop"], ["Matte", "#categories"], ["Glossy", "#categories"], ["Red Bottom", "#categories"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Help</h4>{[["How ordering works", "#why"], ["Delivery — Lusaka & out of town", "#contact"], ["Contact us", "#contact"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Visit / follow</h4><p className="py-1 text-rose-200/80">{SHOP_ADDRESS}</p><a href={waLink("Hi Petal Steps by Thandiwe Mwaba!")} target="_blank" rel="noreferrer" className="block py-1 text-rose-200/80 hover:text-white">WhatsApp {WA_DISPLAY}</a><a href={FB_URL} target="_blank" rel="noreferrer" className="block py-1 text-rose-200/80 hover:text-white">Facebook</a></div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap justify-between gap-2 py-4 text-xs text-rose-200/60">
          <span>© {new Date().getFullYear()} Petal Steps by Thandiwe Mwaba. All rights reserved.</span>
          <span>Prices in ZMW (K450–K650). Only order/pay via {WA_DISPLAY}.</span>
        </div>
      </div>
      <a href={waLink("Hi Petal Steps by Thandiwe Mwaba! I'd like to order heels.")} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition hover:bg-[#1eb85a]">
        <MessageCircle className="h-6 w-6" />
      </a>
    </footer>
  );
}
