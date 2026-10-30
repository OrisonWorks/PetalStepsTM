"use client";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { BadgeCheck, ChevronDown, Clock, Facebook, MapPin, MessageCircle, PiggyBank, ShieldCheck, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PromoPlayer } from "@/components/PromoPlayer";
import { useCart } from "@/context/cart-context";
import { FB_URL, money, SHOP_ADDRESS, WA_DISPLAY, waLink } from "@/lib/utils";
import type { Filter } from "@/lib/products";

const CATS: { filter: Filter; label: string; sub: string; img: string }[] = [
  { filter: "matte", label: "Matte Heels", sub: "Soft finish · work, church & daily polish", img: "/products/image3.jpg" },
  { filter: "glossy", label: "Glossy Heels", sub: "High shine · camel, nude, red & neon", img: "/products/image6.jpg" },
  { filter: "statement", label: "Statement", sub: "Floral & two-tone show-stoppers", img: "/products/image21.jpg" },
  { filter: "red-bottom", label: "Red Bottom", sub: "Signature red sole · K650", img: "/products/image25.jpg" },
];

export function Hero({ styles = 29 }: { styles?: number }) {
  return (
    <section id="top" className="bg-gradient-to-br from-[#fde8d7] via-[#fff7f1] to-[#f3e8ff] py-14">
      <div className="mx-auto grid w-[min(1180px,92%)] items-center gap-10 lg:grid-cols-2">
        <div>
          <Image src="/brand/logo-mark.png" alt="Petal Steps by Thandiwe Mwaba" width={1013} height={552} priority className="h-24 w-auto" />
          <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.05] sm:text-6xl">Women&apos;s heels that <span className="italic text-rose-500">bloom</span> with every step.</h1>
          <p className="mt-5 max-w-lg text-lg text-stone-600">{styles} heel styles in stock in Lusaka — matte, glossy, statement florals and signature red bottoms. EU 35–45, K450–K650. What you see is what&apos;s actually on the shelf.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild><a href="#shop">Shop heels — K450–K650</a></Button>
            <Button size="lg" variant="outline" asChild><a href={waLink("Hi Petal Steps by Thandiwe Mwaba! I'd like to check heel availability.")} target="_blank" rel="noreferrer">WhatsApp {WA_DISPLAY}</a></Button>
          </div>
          <div className="mt-9 flex gap-8">
            {[[String(styles), "Styles in stock"], ["WhatsApp", "Easy ordering"], ["EU 35–45", "Sizes"]].map(([n, l]) => (
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
      <div className="animate-marquee inline-flex"><span className="pr-4">{text.repeat(2)}</span><span className="pr-4" aria-hidden="true">{text.repeat(2)}</span></div>
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
          <button key={c.label} onClick={() => onSelect(c.filter)} className="group overflow-hidden rounded-2xl border border-rose-100 bg-white text-left transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10">
            <Image src={c.img} alt={c.label} width={700} height={340} loading="lazy" className="h-40 w-full object-cover transition-transform group-hover:scale-105" />
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
          <p className="mt-1 text-rose-50">{SHOP_ADDRESS}. Almost-gone styles are marked — grab your EU size before it sells out.</p>
        </div>
        <Button variant="light" size="lg" onClick={() => onSelect("low")}>Shop almost-gone heels</Button>
      </div>
    </section>
  );
}

const WHY = [
  { icon: BadgeCheck, title: "Real stock, real sizes", text: "Every style shows the EU sizes actually in stock, updated live from our sheet. No guessing." },
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
            <div className="flex gap-0.5 text-amber-500" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
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
            <PolicyCards />
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-500/10">
          <label className="block text-sm font-semibold">Your name<Input required autoComplete="name" placeholder="e.g. Tumelo M." className="mt-1" /></label>
          <label className="block text-sm font-semibold">Phone / WhatsApp<Input required type="tel" autoComplete="tel" placeholder="e.g. 071 234 5678" className="mt-1" /></label>
          <label className="block text-sm font-semibold">Message<textarea required rows={4} placeholder="Hi! Do you have the Pink Matte Stiletto in EU 39?" className="mt-1 w-full rounded-xl border border-rose-200 px-4 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" /></label>
          <Button type="submit" className="w-full">Send via WhatsApp →</Button>
        </form>
      </div>
    </section>
  );
}

const POLICY_CARDS = [
  { src: "/brand/order-payment.jpg", title: "Order & payment details" },
  { src: "/brand/delivery-lusaka.jpg", title: "Delivery policy — Lusaka" },
  { src: "/brand/delivery-out-of-town.jpg", title: "Out-of-town delivery" },
];

// The three printed policy cards: thumbnails open a readable full-size view.
export function PolicyCards() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {POLICY_CARDS.map((c, i) => (
        <button
          key={c.src}
          type="button"
          onClick={() => setOpen(i)}
          title={`${c.title} — tap to read`}
          className="group overflow-hidden rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <Image
            src={c.src}
            alt={c.title}
            width={300}
            height={380}
            className="h-36 w-full object-cover object-top transition-transform group-hover:scale-105"
          />
        </button>
      ))}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl p-0">
          {open !== null && (
            <>
              <DialogTitle className="sr-only">{POLICY_CARDS[open].title}</DialogTitle>
              <Image
                src={POLICY_CARDS[open].src}
                alt={POLICY_CARDS[open].title}
                width={1080}
                height={1350}
                className="h-auto w-full"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I place an order?",
    a: (
      <>
        Confirm availability on WhatsApp before paying, then send your{" "}
        <strong>name, number, location, product paid for, and courier of choice</strong>,
        and attach your proof of payment. Lusaka orders send a Yango for collection
        (request booking details first); out-of-town orders go by courier, charged
        separately after weighing and valuation.
      </>
    ),
  },
  {
    q: "How do I pay?",
    a: (
      <>
        Mobile money only, then attach proof of payment.{" "}
        <strong>Airtel:</strong> 0977235607 — Option 1: Send Money (Daniel Mwaba).{" "}
        <strong>MTN:</strong> 0962222926 — Option 1: Send Money (Sungo Siphokazi Daka).{" "}
        <strong>FNB eWallet:</strong> request details on WhatsApp.{" "}
        <em>NB: kindly add the withdrawal fee to all mobile money payments.</em>
      </>
    ),
  },
  {
    q: "How does delivery work in Lusaka?",
    a: (
      <>
        You book a Yango and send the rider to collect. Booking times: Mon–Fri
        10:00–16:00, Sat 09:00–13:00, Sun closed. Pick-up: Munali Rd 4774, Thompson
        Park (right before Mosi-Oa-Tunya on Yango/Google Maps) — delivery bookings
        on +260 76 0732751 only; never pay or change orders on other numbers. Send
        the rider after confirming with the store; the rider collects inside the
        shop. Yango waiting charges are not covered.
      </>
    ),
  },
  {
    q: "What about out-of-town delivery?",
    a: (
      <>
        Couriers: <strong>Platinum and Falcon</strong>. Cost is quoted only after
        purchase, once the parcel is weighed and evaluated; insurance is discussed
        directly with the courier. Other couriers may add packaging fees outside
        the receipt — discuss with your courier. A <strong>bus courier</strong>{" "}
        option is also available: fee negotiated and paid by you — please request a
        receipt. Items are dispatched at designated times once packaged; once the
        courier confirms goods are in good condition and ships them, Petal Steps is
        not liable for loss or damage.
      </>
    ),
  },
  {
    q: "Can I collect in person, and how long will you hold my order?",
    a: (
      <>
        Yes — the shop is at {SHOP_ADDRESS}. Orders are held{" "}
        <strong>5 days</strong>; after that a K5/day storage fee applies. Delivery
        can be arranged at your cost.
      </>
    ),
  },
];

export function Faqs() {
  return (
    <section id="faqs" className="bg-[#fff7f1] py-14">
      <div className="mx-auto w-[min(880px,92%)]">
        <h2 className="font-display text-center text-3xl font-semibold sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 text-center text-stone-500">
          Ordering, payment and delivery — tap the policy cards below for the printed version.
        </p>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-rose-100 bg-white px-5 py-4 open:shadow-md open:shadow-rose-500/10"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-stone-800 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-rose-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3">
          <PolicyCards />
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see it
  const [busy, setBusy] = useState(false);

  const subscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        toast.error(d.error || "Couldn't subscribe — try again");
        return;
      }
      toast.success(
        d.already
          ? "You're already on the Petal List 🌸"
          : "Welcome to the Petal List 🌸 You're subscribed!"
      );
      setEmail("");
    } catch {
      toast.error("Couldn't subscribe — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-rose-100/70 py-12">
      <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl font-semibold">Join the Petal List 🌸</h2>
          <p className="text-stone-500">First dibs on new heel drops, restocks and almost-gone sizes.</p>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={subscribe}>
          {/* honeypot: invisible to humans, bots fill it and get dropped */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <label className="sr-only" htmlFor="petal-email">Your email address</label>
          <Input id="petal-email" type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-64 rounded-full" />
          <Button type="submit" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</Button>
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
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.jpg" alt="Petal Steps by Thandiwe Mwaba" width={1080} height={1080} className="h-12 w-12 rounded-full" />
            <div>
              <p className="font-script text-3xl text-white">Petal Steps</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-300">By Thandiwe Mwaba</p>
            </div>
          </div>
          <p className="mt-2 max-w-xs text-sm text-rose-200/70">Women&apos;s heels that bloom with every step. Lusaka, Zambia.</p>
        </div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Shop</h4>{[["All heels", "#shop"], ["Matte", "#categories"], ["Glossy", "#categories"], ["Red Bottom", "#categories"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Help</h4>{[["FAQs — ordering, payment & delivery", "#faqs"], ["How ordering works", "#why"], ["Delivery — Lusaka & out of town", "#faqs"], ["Contact us", "#contact"]].map(([l, h]) => <a key={l} href={h} className="block py-1 text-rose-200/80 hover:text-white">{l}</a>)}</div>
        <div><h4 className="font-display mb-3 font-semibold text-white">Visit / follow</h4><p className="py-1 text-rose-200/80">{SHOP_ADDRESS}</p><a href={waLink("Hi Petal Steps by Thandiwe Mwaba!")} target="_blank" rel="noreferrer" className="block py-1 text-rose-200/80 hover:text-white">WhatsApp {WA_DISPLAY}</a><a href={FB_URL} target="_blank" rel="noreferrer" className="block py-1 text-rose-200/80 hover:text-white">Facebook</a></div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(1180px,92%)] flex-wrap justify-between gap-2 py-4 text-xs text-rose-200/60">
          <span>© {new Date().getFullYear()} Petal Steps by Thandiwe Mwaba. All rights reserved.</span>
          <span>Prices in ZMW (K450–K650). Only order/pay via {WA_DISPLAY}.</span>
        </div>
      </div>
      <a href={waLink("Hi Petal Steps by Thandiwe Mwaba! I'd like to order heels.")} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition hover:bg-[#1eb85a] md:bottom-8 md:left-5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.26-.47-2.4-1.49-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.58-.35M12.05 21.79h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97.99-3.62-.23-.37a9.77 9.77 0 0 1-1.5-5.22c0-5.4 4.4-9.8 9.82-9.8a9.75 9.75 0 0 1 9.8 9.81c0 5.4-4.4 9.8-9.8 9.8m8.35-18.15A11.7 11.7 0 0 0 12.04 0C5.49 0 .16 5.32.16 11.88c0 2.09.55 4.13 1.59 5.93L.06 24l6.33-1.66a11.86 11.86 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.32 11.88-11.88 0-3.18-1.24-6.16-3.53-8.4" />
        </svg>
      </a>
    </footer>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className="fixed bottom-36 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-white/90 text-stone-600 shadow-lg backdrop-blur transition hover:border-rose-400 hover:text-rose-500 md:bottom-24">
      <ChevronDown className="h-5 w-5 rotate-180" />
    </button>
  );
}

export function MobileOrderBar() {
  const { count, subtotal, open, setOpen } = useCart();
  if (!count || open) return null;
  return (
    <button onClick={() => setOpen(true)} className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-full bg-stone-900 px-5 py-3.5 text-sm font-bold text-white shadow-xl md:hidden">
      <span>Your bag · {count} item{count === 1 ? "" : "s"} · {money(subtotal)}</span>
      <span className="rounded-full bg-rose-500 px-4 py-1.5">Order →</span>
    </button>
  );
}
