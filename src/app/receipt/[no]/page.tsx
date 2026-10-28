"use client";
import { use, useEffect, useState } from "react";

type Receipt = {
  no: string;
  date: string;
  client: string;
  phone: string;
  items: string;
  amount: string;
  words: string;
  method: string;
  balance: string;
  note: string;
};

const dotted = "flex-1 border-b border-dotted border-stone-400 pb-0.5 min-h-5";

export default function ReceiptPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = use(params);
  const [r, setR] = useState<Receipt | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("k") || "";
    fetch(`/api/receipt/${encodeURIComponent(no)}?k=${encodeURIComponent(k)}`, { cache: "no-store" })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.ok) {
          setR(d.receipt);
          setState("ready");
        } else setState("error");
      })
      .catch(() => setState("error"));
  }, [no]);

  if (state === "loading") {
    return <main className="mx-auto w-[min(720px,92%)] py-20 text-center text-stone-500">Loading receipt…</main>;
  }
  if (state === "error" || !r) {
    return (
      <main className="mx-auto w-[min(720px,92%)] py-20 text-center">
        <h1 className="text-2xl font-bold text-stone-800">Receipt not found</h1>
        <p className="mt-2 text-stone-500">Check the link or contact Petal Steps on WhatsApp +260 760 732 751.</p>
      </main>
    );
  }

  const dateStr = r.date ? new Date(r.date.replace(" ", "T")).toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" }) : "";
  const method = (r.method || "").toLowerCase();

  return (
    <main className="mx-auto w-[min(680px,94%)] py-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-rose-500/5 print:border-0 print:shadow-none">
        {/* brand header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-stone-800 pb-4">
          <div>
            <p className="font-script text-5xl leading-none text-stone-900">Petal Steps</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.35em] text-stone-500">By Thandiwe Mwaba</p>
          </div>
          <div className="text-right text-xs leading-relaxed text-stone-600">
            <p>Location: Block A Shop B, Thompson Park,<br />Munali Rd 4774, Lusaka- Zambia</p>
            <p>Contact: +260 76 0732751</p>
            <p>Email: yaramwaba@gmail.com</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="rounded border-2 border-rose-500 px-3 py-0.5 text-lg font-bold tracking-[0.2em] text-rose-500">RECEIPT</span>
          <div className="text-right text-sm">
            <p><span className="font-semibold">No.</span> {r.no}</p>
            <p><span className="font-semibold">Date:</span> {dateStr}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-5 text-sm">
          <div className="flex items-end gap-2">
            <dt className="shrink-0 font-semibold">Received from:</dt>
            <dd className={dotted}>{r.client}</dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="shrink-0 font-semibold">Sum of (Amount in words):</dt>
            <dd className={dotted}>{r.words}</dd>
            <dd className="w-24 shrink-0 rounded border border-stone-400 px-3 py-1.5 text-center font-bold">
              K{Number(r.amount).toLocaleString("en-ZM")}
            </dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="shrink-0 font-semibold">Balance:</dt>
            <dd className={dotted}>{r.balance || "—"}</dd>
          </div>
          <div className="flex items-end gap-2">
            <dt className="shrink-0 font-semibold">Payment for:</dt>
            <dd className={`${dotted} whitespace-pre-line`}>{r.items}</dd>
          </div>
          <div className="flex items-end gap-4">
            <dt className="flex shrink-0 items-center gap-4 font-semibold">
              <span className="flex items-center gap-1.5">
                Cash
                <span className={`flex h-4 w-4 items-center justify-center border border-stone-500 text-[10px] ${method === "cash" ? "bg-stone-800 text-white" : ""}`}>{method === "cash" ? "✓" : ""}</span>
              </span>
              <span className="flex items-center gap-1.5">
                Cheque
                <span className={`flex h-4 w-4 items-center justify-center border border-stone-500 text-[10px] ${method === "cheque" ? "bg-stone-800 text-white" : ""}`}>{method === "cheque" ? "✓" : ""}</span>
              </span>
              {method !== "cash" && method !== "cheque" && <span>{r.method}</span>}
            </dt>
            <dd className={dotted} />
            <dt className="shrink-0 font-semibold">Signature:</dt>
            <dd className="w-40 border-b border-dotted border-stone-400 pb-0.5 min-h-5" />
          </div>
          {r.note && (
            <div className="flex items-end gap-2">
              <dt className="shrink-0 font-semibold">Note:</dt>
              <dd className={dotted}>{r.note}</dd>
            </div>
          )}
        </dl>

        <div className="mt-8 h-1.5 rounded bg-gradient-to-r from-rose-300 via-rose-500 to-stone-900" />
        <p className="mt-3 text-center text-xs text-stone-400">
          Thank you for shopping with Petal Steps 🌸 Interim receipt — ZRA smart invoicing coming soon.
        </p>
      </div>

      <div className="mt-4 flex justify-center gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Print / save as PDF
        </button>
        <a
          href="/"
          className="rounded-lg bg-stone-200 px-5 py-2 text-sm font-semibold text-stone-700"
        >
          Back to shop
        </a>
      </div>
    </main>
  );
}
