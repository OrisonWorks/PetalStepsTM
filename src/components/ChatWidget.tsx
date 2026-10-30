"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { ClientProduct } from "@/lib/products";
import { waLink } from "@/lib/utils";

type Msg = { from: "bot" | "user"; text: string; link?: { label: string; href: string } };

const WA_ORDER = waLink("Hi Petal Steps by Thandiwe Mwaba! I'd like to place an order.");
const WA_QUESTION = waLink("Hi Petal Steps by Thandiwe Mwaba! I have a question about your heels.");

// Finds the product the message is about. `hit` is set only when exactly
// one product qualifies — a tie (e.g. "a stiletto") returns the tied
// `candidates` so the bot asks which style rather than guessing stock.
const FILLER = new Set(["the", "and", "for", "you", "have", "any", "with", "this", "that", "your", "heel", "heels", "shoe", "shoes"]);
function matchProduct(q: string, products: ClientProduct[]): { hit: ClientProduct | null; candidates: ClientProduct[] } {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const words = norm(q).split(/\s+/).filter((w) => w.length >= 3 && !FILLER.has(w));
  // Score on name + colour words — "apricot" lives in `color`, not `name`.
  const scored = products.map((p) => {
    const nameWords = norm(p.name + " " + p.color).split(/\s+/).filter((w) => w.length >= 3 && !FILLER.has(w));
    const score = nameWords.filter((w) => words.some((q) => q.startsWith(w) || w.startsWith(q))).length;
    return { p, score };
  });
  const bestScore = Math.max(0, ...scored.map((s) => s.score));
  const candidates = bestScore > 0 ? scored.filter((s) => s.score === bestScore).map((s) => s.p) : [];
  return { hit: candidates.length === 1 ? candidates[0] : null, candidates };
}

function reply(raw: string, products: ClientProduct[], pendingSize?: number | null): Omit<Msg, "from"> & { pendingSize?: number | null } {
  const q = raw.toLowerCase();
  const sizeMatch = /\b(3[5-9]|4[0-5])\b/.exec(q);
  // A size in this message wins; otherwise fall back to the size carried
  // over from the question the bot just asked to clarify.
  const size = sizeMatch ? parseInt(sizeMatch[1], 10) : pendingSize ?? null;
  const { hit: p, candidates } = matchProduct(q, products);

  // Several styles tie on the words given ("a stiletto", "something red") —
  // ask which one instead of quoting an arbitrary style's stock. The size
  // rides along in pendingSize so the next message still answers the
  // original lookup.
  if (!p && candidates.length > 1) {
    const names = candidates.slice(0, 4).map((c) => c.name).join(", ");
    return { text: `We have a few like that — which one? ${names}. ${size ? `(Still looking for EU ${size}.)` : "Tell me the name or code and I'll check stock."}`, pendingSize: size };
  }
  const stockLine = (prod: ClientProduct) => {
    const sizes = Object.keys(prod.stock).map((s) => `EU ${s}`);
    return sizes.length
      ? `Yes — ${prod.name} (K${prod.price}) is in stock in ${sizes.join(", ")}.`
      : `${prod.name} is sold out right now — message us on WhatsApp and we'll tell you when it restocks.`;
  };

  if (p && size)
    return p.stock[size]
      ? { text: `${p.name} in EU ${size}: ${p.stock[size] === "low" ? "only a few left" : "in stock"} (K${p.price}). Tap below to order on WhatsApp.`, link: { label: "Order on WhatsApp", href: WA_ORDER } }
      : { text: `${p.name} in EU ${size} is sold out. ${p.stock && Object.keys(p.stock).length ? "Other sizes still available — ask me!" : "Message us on WhatsApp for restock news."}`, link: { label: "Ask on WhatsApp", href: WA_QUESTION } };
  if (p && /price|cost|much|pay/.test(q))
    return { text: `${p.name} is K${p.price}. ${stockLine(p)}`, link: { label: "Order on WhatsApp", href: WA_ORDER } };
  if (p && /stock|size|available|have|left|eu/.test(q))
    return { text: stockLine(p), link: { label: "Order on WhatsApp", href: WA_ORDER } };
  if (p) return { text: stockLine(p), link: { label: "See it on WhatsApp", href: WA_QUESTION } };

  if (/pay|airtel|mtn|fnb|ewallet|money|deposit|proof/.test(q))
    return { text: "Mobile money only, then attach your proof of payment. Airtel: 0977235607 (Daniel Mwaba). MTN: 0962222926 (Sungo Siphokazi Daka). FNB eWallet: ask on WhatsApp. Please add the withdrawal fee to your payment.", link: { label: "Confirm on WhatsApp", href: WA_QUESTION } };
  if (/yango|lusaka|pick ?up|collect|booking/.test(q))
    return { text: "In Lusaka you book a Yango to collect at Munali Rd 4774, Thompson Park (before Mosi-Oa-Tunya on the map). Booking times: Mon–Fri 10:00–16:00, Sat 09:00–13:00, Sun closed. Send the rider only after confirming with us — bookings on +260 760 732 751." };
  if (/courier|deliver|ship|kitwe|ndola|livingstone|out of town|town|send/.test(q))
    return { text: "Out-of-town orders go by Platinum or Falcon courier — the fee is quoted after weighing, and a bus-courier option is available too (you negotiate the fee, keep the receipt). Dispatch happens at designated times once packaged.", link: { label: "Ask on WhatsApp", href: WA_QUESTION } };
  if (/hold|reserve|keep|days|storage/.test(q))
    return { text: "We hold paid orders for 5 days at Munali Rd 4774. After that a K5/day storage fee applies — or we can arrange delivery at your cost." };
  if (/hour|open|close|when/.test(q))
    return { text: "Collection bookings run Mon–Fri 10:00–16:00 and Sat 09:00–13:00; closed Sundays. The shop itself is at Munali Rd 4774, Thompson Park." };
  if (/where|address|location|find|map/.test(q))
    return { text: "Munali Rd 4774, Thompson Park, Lusaka — right before Mosi-Oa-Tunya on Yango/Google Maps. Collections by Yango booking only." };
  if (/order|buy|purchase|how/.test(q))
    return { text: "Easy: 1) confirm availability on WhatsApp, 2) pay by mobile money, 3) send your name, number, location, product and courier of choice with proof of payment. Lusaka: Yango collects. Out of town: courier.", link: { label: "Start my order", href: WA_ORDER } };
  if (/whatsapp|contact|call|number|phone|talk|human|person/.test(q))
    return { text: "Our WhatsApp is +260 760 732 751 — it's the only number for orders and delivery bookings.", link: { label: "Open WhatsApp", href: WA_QUESTION } };
  if (/refund|return|exchange|swap|wrong/.test(q))
    return { text: "For returns or exchanges, message us on WhatsApp with your receipt number and we'll sort it out with you.", link: { label: "WhatsApp us", href: WA_QUESTION } };
  if (/hi|hello|hey|morning|afternoon|good/.test(q))
    return { text: "Hello! Ask me anything — sizes in stock, prices, payment, delivery in Lusaka or out of town. Try 'do you have Apricot in EU 38?'" };
  if (/thank|great|perfect|nice/.test(q))
    return { text: "Happy to help! Anything else — or shall we get those heels ordered?", link: { label: "Order on WhatsApp", href: WA_ORDER } };
  return { text: "I'm best at stock, prices, payment and delivery questions — for anything else our WhatsApp has you covered.", link: { label: "Chat on WhatsApp", href: WA_QUESTION } };
}

const QUICK = ["How do I order?", "Payment options", "Delivery in Lusaka", "How long do you hold orders?"];

export function ChatWidget({ products }: { products: ClientProduct[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Hi! I'm the Petal Steps helper — ask about sizes in stock, prices, payment or delivery." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  // Size carried over from the last question, so a follow-up that just
  // names the style still answers the original "EU 38?" lookup.
  const pendingSizeRef = useRef<number | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const r = reply(t, products, pendingSizeRef.current);
    pendingSizeRef.current = r.pendingSize ?? null;
    setMsgs((m) => [...m, { from: "user", text: t }, { from: "bot" as const, text: r.text, link: r.link }]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-36 right-3 z-40 flex h-[min(460px,62vh)] w-[min(340px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xl md:bottom-24 md:right-5">
          <div className="flex items-center gap-2 bg-rose-500 px-4 py-3 text-white">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-bold">Petal Steps helper</span>
            <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1 hover:bg-white/20" aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "bot" ? "pr-8" : "pl-8"}>
                <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.from === "bot" ? "rounded-tl-sm bg-rose-50 text-stone-700" : "rounded-tr-sm bg-stone-800 text-white"}`}>
                  {m.text}
                  {m.link && (
                    <a href={m.link.href} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg bg-rose-500 px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-rose-600">
                      {m.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-rose-100 p-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK.map((chip) => (
                <button key={chip} onClick={() => send(chip)} className="rounded-full border border-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50">
                  {chip}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Message the Petal Steps helper"
                placeholder="Ask about a style, size, delivery…"
                className="flex-1 rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
              <button type="submit" className="rounded-xl bg-rose-500 p-2 text-white hover:bg-rose-600" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl hover:bg-rose-600 md:bottom-8 md:right-5"
        aria-label="Chat with us"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </>
  );
}
