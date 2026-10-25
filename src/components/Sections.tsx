"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Clock, Facebook, Footprints, MessageCircle, PiggyBank, RefreshCcw, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PromoPlayer } from "@/components/PromoPlayer";
import { FB_URL } from "@/lib/utils";
import type { Filter } from "@/lib/products";

const CATS: { filter: Filter; label: string; sub: string; img: string }[] = [
  { filter: "women", label: "Women", sub: "Heels, flats, sneakers & more", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=80&auto=format&fit=crop" },
  { filter: "men", label: "Men", sub: "Sneakers, loafers & boots", img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=700&q=80&auto=format&fit=crop" },
  { filter: "kids", label: "Kids", sub: "Comfy, durable & fun", img: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=700&q=80&auto=format&fit=crop" },
  { filter: "sale", label: "Sale", sub: "Up to 40% off selected pairs", img: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&q=80&auto=format&fit=crop" },
];

export function Hero() {
  return (
    <section id="top" className="bg-gradient-to-br from-rose-50 via-white to-white py-14">
      <div className="mx-auto grid w-[min(1180px,92%)] items-center gap-10 lg:grid-cols-2">
        <div>
          <Badge variant="soft" className="mb-4 normal-case tracking-normal">🌸 Petal Steps by TM</Badge>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            Every step<br /><span className="italic text-rose-500">blooms</span> with style.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-stone-500">
            Comfortable, head-turning footwear for women, men and kids — from everyday sneakers to occasion heels. Quality pairs, honest prices, delivered to your door.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild><a href="#shop">Shop the collection</a></Button>
            <Button size="lg" variant="outline" asChild><a href="#categories">Browse categories</a></Button>
          </div>
          <div className="mt-9 flex gap-8">
            {[["500+", "Happy customers"], ["120+", "Styles in store"], ["4.9★", "Average rating"]].map(([n, l]) => (
              <div key={l}><strong className="font-display block text-2xl">{n}</strong><span className="text-xs text-stone-500">{l}</span></div>
            ))}
          </div>
        </div>
        <div>
          <PromoPlayer />
          <p className="mt-3 text-center text-xs text-stone-400">▶ Our 10-second promo — made with Remotion. Render it for Facebook with <code>npm run remotion:render</code></p>
        </div>
      </div>
    </section>
  );
}

export function Marquee() {
  const text = "New arrivals weekly ✦ Free delivery over R800 ✦ Easy exchanges ✦ Women · Men · Kids ✦ ";
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
        <Badge variant="soft" className="mb-3">Shop by category</Badge>
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
    <section className="bg-gradient-to-r from-rose-500 to-rose-400 py-12 text-white">
      <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap items-center justify-between gap-6">
        <div>
          <Badge className="mb-3 bg-white/20 text-white">Limited time</Badge>
          <h2 className="font-display text-4xl font-semibold">Up to 40% off selected styles</h2>
          <p className="mt-1 text-rose-50">When they&apos;re gone, they&apos;re gone. Grab your size before it sells out.</p>
        </div>
        <Button variant="light" size="lg" onClick={() => onSelect("sale")}>Shop the sale</Button>
      </div>
    </section>
  );
}

const WHY = [
  { icon: Footprints, title: "All-day comfort", text: "Cushioned soles and breathable materials, chosen for real life — not just the photo." },
  { icon: PiggyBank, title: "Honest prices", text: "Boutique look without the boutique mark-up. Regular sales and bundle deals." },
  { icon: Truck, title: "Fast delivery", text: "Orders confirmed quickly and delivered to your door. Free delivery over R800." },
  { icon: RefreshCcw, title: "Easy exchanges", text: "Wrong size? No stress — exchange for the right fit, hassle-free." },
];

export function WhyUs() {
  return (
    <section id="why" className="mx-auto w-[min(1180px,92%)] py-16">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <Badge variant="soft" className="mb-3">Why Petal Steps</Badge>
        <h2 className="font-display text-4xl font-semibold">Made to be walked in</h2>
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
  { text: "My sneakers arrived so fast and they're even prettier in person. I wear them every day!", name: "Naledi M." },
  { text: "Ordered heels for a wedding. Perfect fit, super comfortable, and I danced all night.", name: "Thandi K." },
  { text: "Great service on Facebook — they helped me pick the right size for my daughter. Will buy again.", name: "Lerato S." },
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
    toast.success("Thanks! Opening Facebook — send your message there for the fastest reply 🌸");
    setTimeout(() => window.open(FB_URL, "_blank"), 900);
    (e.target as HTMLFormElement).reset();
  };
  return (
    <section id="contact" className="mx-auto w-[min(1180px,92%)] pb-16">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <Badge variant="soft" className="mb-3">Get in touch</Badge>
          <h2 className="font-display text-4xl font-semibold">Questions? Let&apos;s talk shoes.</h2>
          <p className="mt-3 text-stone-500">Message us on Facebook for the fastest reply, stock checks and size advice. You can also place your order right here — we&apos;ll confirm it with you personally.</p>
          <ul className="mt-6 space-y-3 font-semibold">
            <li className="flex items-center gap-2"><Facebook className="h-5 w-5 text-rose-500" /><a className="text-rose-600 underline" href={FB_URL} target="_blank" rel="noreferrer">Petal Steps by TM on Facebook</a></li>
            <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-rose-500" /> Mon–Sat · 9:00 – 18:00</li>
            <li className="flex items-center gap-2"><Truck className="h-5 w-5 text-rose-500" /> Delivery available — free over R800</li>
          </ul>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-500/10">
          <label className="block text-sm font-semibold">Your name<Input required placeholder="e.g. Tumelo M." className="mt-1" /></label>
          <label className="block text-sm font-semibold">Phone / WhatsApp<Input required placeholder="e.g. 071 234 5678" className="mt-1" /></label>
          <label className="block text-sm font-semibold">Message<textarea required rows={4} placeholder="Hi! Do you have the Bloom Runners in size 6?" className="mt-1 w-full rounded-xl border border-rose-200 px-4 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" /></label>
          <Button type="submit" className="w-full">Send via Facebook →</Button>
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
          <p className="text-stone-500">First dibs on new drops, restocks and members-only specials.</p>
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
          <p className="font-display text-xl font-bold text-white">🌸 Petal Steps <em className="text-base text-rose-400">by TM</em></p>
          <p className="mt-2 max-w-xs text-sm text-rose-200/70">Footwear that blooms with every step. Women · Men · Kids.</p>
        </div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Shop</h4>{[["All shoes", "#shop"], ["Women", "#categories"], ["Men", "#categories"], ["Kids", "#categories"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Help</h4>{[["Delivery & exchanges", "#why"], ["Size advice", "#contact"], ["Contact us", "#contact"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Follow us</h4><a href={FB_URL} target="_blank" rel="noreferrer" className="block py-1 text-rose-200/80 hover:text-white">Facebook</a></div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap justify-between gap-2 py-4 text-xs text-rose-200/60">
          <span>© {new Date().getFullYear()} Petal Steps by TM. All rights reserved.</span>
          <span>Prices in ZAR. Confirm stock &amp; final price when you order.</span>
        </div>
      </div>
      <a href={FB_URL} target="_blank" rel="noreferrer" aria-label="Chat on Facebook" className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition hover:bg-rose-600">
        <MessageCircle className="h-6 w-6" />
      </a>
    </footer>
  );
}
