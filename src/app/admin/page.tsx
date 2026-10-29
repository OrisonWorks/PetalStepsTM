"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { totalPairs } from "@/lib/products";
import { amountInWords } from "@/lib/money-words";
import { waLink } from "@/lib/utils";
import { parseCsv } from "@/lib/csv";

const CATEGORIES = ["matte", "glossy", "statement", "red-bottom"] as const;

const inputCls =
  "w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300";

type LogRow = { ts: string; action: string; model: string; size: string; note: string };

type Subscriber = { ts: string; email: string; status?: string };

type ReceiptRow = {
  no: string; date: string; client: string; phone: string; items: string;
  amount: string | number; method: string; area?: string; heard?: string;
};

type AnalyticsData = {
  log: LogRow[];
  receipts: ReceiptRow[];
  subscribers: Subscriber[];
  receiptsSupported: boolean;
  logSupported: boolean;
  subsSupported: boolean;
};

// One shared fetch of log + receipts + subscribers for every admin panel.
function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setData({
          log: json.log || [],
          receipts: json.receipts || [],
          subscribers: json.subscribers || [],
          receiptsSupported: json.receiptsSupported === true,
          logSupported: json.logSupported !== false,
          subsSupported: json.subsSupported !== false,
        });
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

const dayOf = (ts: string | number | Date) => String(ts).slice(0, 10);

// Maps a log row to the counter it affects. `undo` rows carry the same
// "a→b" stock note as the write they reversed, so the direction says which
// bucket to decrement: next>prev reversed a sale, next<prev a restock.
const countAction = (r: LogRow): { kind: string; sign: number } => {
  if (r.action !== "undo") return { kind: r.action, sign: 1 };
  const m = String(r.note || "").split("→").map((x) => parseInt(x, 10));
  return m.length === 2 && m.every((x) => !isNaN(x))
    ? { kind: m[1] > m[0] ? "sold" : "restock", sign: -1 }
    : { kind: "undo", sign: 1 };
};

// Pairs each `undo` with the original write it reversed — same model+size
// and the mirror-image note — and zeroes BOTH, so the sale is removed from
// the day it happened (not netted off the undo's day). An undo whose
// original predates the fetched window keeps its -1 fallback.
type NetRow = { r: LogRow; kind: string; sign: number };
const netLogRows = (rows: LogRow[]): NetRow[] => {
  const out: NetRow[] = rows.map((r) => ({ r, ...countAction(r) }));
  for (let i = out.length - 1; i >= 0; i--) {
    const u = out[i];
    if (u.r.action !== "undo" || u.kind === "undo") continue;
    const m = String(u.r.note).split("→").map((x) => parseInt(x, 10));
    const mirror = `${m[1]}→${m[0]}`;
    for (let j = i - 1; j >= 0; j--) {
      const o = out[j];
      if (o.sign === 0 || o.r.action !== u.kind) continue;
      if (o.r.model === u.r.model && String(o.r.size) === String(u.r.size) && String(o.r.note) === mirror) {
        o.sign = 0;
        u.sign = 0;
        break;
      }
    }
  }
  return out;
};

function downloadCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v);
    // Leading =, +, -, @ executes as a formula when the CSV is opened in
    // a spreadsheet — prefix with ' so the export stays inert.
    if (/^\s*[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SubscribersPanel() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/subscribers", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setFailed(true);
        return;
      }
      setSubs(data.subscribers || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const active = subs.filter((s) => !s.status);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(active.map((s) => s.email).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the emails manually");
    }
  };

  const optOut = async (email: string) => {
    try {
      const res = await fetch("/api/admin/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Couldn't mark opt-out");
        return;
      }
      setSubs((list) => list.map((s) => (s.email === email ? { ...s, status: "stop" } : s)));
      toast.success(`${email} opted out`);
    } catch {
      toast.error("Couldn't mark opt-out — network error");
    }
  };

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-stone-800">Petal List subscribers</h2>
        {!loading && !failed && (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
            {active.length} active{subs.length - active.length ? ` · ${subs.length - active.length} opted out` : ""}
          </span>
        )}
        {subs.length > 0 && (
          <button
            onClick={copyAll}
            className="ml-auto rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
          >
            {copied ? "Copied!" : "Copy all emails"}
          </button>
        )}
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-stone-400">Loading…</p>
      ) : failed ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Couldn't load the mailing list — the sheet writer may be down or out of date.
          <button onClick={load} className="ml-3 font-semibold underline">Retry</button>
        </div>
      ) : subs.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-stone-400">
          No subscribers yet — signups from the site footer appear here.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="pb-2">Email</th>
              <th className="pb-2 text-right">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {[...subs].reverse().map((s, i) => (
              <tr key={`${s.email}-${i}`} className="border-t border-rose-50">
                <td className="py-2 font-semibold text-stone-700">
                  {s.email}
                  {s.status && (
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                      opted out
                    </span>
                  )}
                </td>
                <td className="py-2 text-right text-stone-500">
                  {String(s.ts).slice(0, 16).replace("T", " ")}
                  {!s.status && (
                    <button
                      onClick={() => optOut(s.email)}
                      title="Mark opted out (reply-STOP)"
                      className="ml-3 rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 hover:bg-rose-100 hover:text-rose-600"
                    >
                      stop
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-4 text-xs text-stone-400">
        Stored on the SUBSCRIBERS tab of your stock sheet — “Copy all emails” gives the active
        addresses for a BCC email or broadcast tool. Reply-STOP requests: hit “stop” on their row
        and newsletters skip them.
      </p>
    </div>
  );
}

function ReportsPanel() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/report?day=${d}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Report failed");
        return;
      }
      setRows(data.rows || []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Net counts: undo+original pairs drop out entirely; unpaired undos
  // decrement the action they reversed.
  const net = { sold: 0, interest: 0, restock: 0 };
  const byModel = new Map<string, number>();
  const interestByModel = new Map<string, number>();
  netLogRows(rows).forEach(({ r, kind, sign }) => {
    if (kind === "sold" || kind === "restock" || kind === "interest") {
      net[kind as keyof typeof net] += sign;
      if (kind === "sold") byModel.set(r.model, (byModel.get(r.model) || 0) + sign);
      if (kind === "interest") interestByModel.set(r.model, (interestByModel.get(r.model) || 0) + 1);
    }
  });

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-stone-800">Daily report</h2>
        <input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="rounded-lg border border-rose-100 px-3 py-1.5 text-sm outline-none focus:border-rose-300"
        />
        <button
          onClick={() => load(day)}
          disabled={loading}
          className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>
      {loaded && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-rose-50 p-3">
              <strong className="block text-2xl text-rose-600">{net.sold}</strong>
              <span className="text-xs text-stone-500">pairs sold</span>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <strong className="block text-2xl text-stone-700">{net.interest}</strong>
              <span className="text-xs text-stone-500">order taps</span>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <strong className="block text-2xl text-stone-700">{net.restock}</strong>
              <span className="text-xs text-stone-500">restocks</span>
            </div>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="pb-2">Model</th>
                <th className="pb-2 text-right">Sold</th>
                <th className="pb-2 text-right">Interest taps</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set([...byModel.keys(), ...interestByModel.keys()])).map((m) => (
                <tr key={m} className="border-t border-rose-50">
                  <td className="py-2 font-semibold text-stone-700">{m}</td>
                  <td className="py-2 text-right">{byModel.get(m) || 0}</td>
                  <td className="py-2 text-right text-stone-500">{interestByModel.get(m) || 0}</td>
                </tr>
              ))}
              {net.sold === 0 && net.interest === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-stone-400">No activity this day</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function ReceiptPanel({ products }: { products: Product[] }) {
  const { data: aData } = useAnalytics();
  const [form, setForm] = useState({
    client: "",
    phone: "",
    email: "",
    items: "",
    amount: "",
    words: "",
    method: "Cash",
    balance: "",
    note: "",
    area: "",
    heard: "",
  });
  const knownPhones = new Set((aData?.receipts || []).map((r) => String(r.phone || "").replace(/[^0-9]/g, "")).filter(Boolean));
  const isRepeat = form.phone.replace(/[^0-9]/g, "").length > 5 && knownPhones.has(form.phone.replace(/[^0-9]/g, ""));
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ no: string; key: string } | null>(null);
  const [skuPick, setSkuPick] = useState("");
  const [sizePick, setSizePick] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const amountNum = parseInt(form.amount.replace(/[^0-9]/g, ""), 10) || 0;

  const addItem = () => {
    const p = products.find((q) => q.sku === skuPick);
    if (!p) return;
    const line = `${p.name} (${p.sku})${sizePick ? ` — EU ${sizePick}` : ""} — K${p.price}`;
    const items = form.items ? form.items + "\n" + line : line;
    const amount = String((parseInt(form.amount.replace(/[^0-9]/g, ""), 10) || 0) + p.price);
    setForm((f) => ({ ...f, items, amount, words: amountInWords(parseInt(amount, 10)) }));
    setSkuPick("");
    setSizePick("");
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client.trim()) return toast.error("Client name required");
    if (!(amountNum > 0)) return toast.error("Amount must be a positive number");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        toast.error(d.error || "Receipt failed");
        return;
      }
      setCreated({ no: d.no, key: d.key || "" });
      toast.success(`Receipt ${d.no} created${d.emailed ? " and emailed" : ""}`);
    } catch {
      toast.error("Receipt failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setForm({ client: "", phone: "", email: "", items: "", amount: "", words: "", method: "Cash", balance: "", note: "", area: "", heard: "" });
  };

  if (created) {
    const link = `${window.location.origin}/receipt/${created.no}?k=${created.key}`;
    const shareText = `Your Petal Steps receipt ${created.no} — ${link}`;
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-6 text-center">
        <p className="text-sm text-stone-500">Receipt created</p>
        <p className="font-display mt-1 text-3xl font-semibold text-rose-600">{created.no}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a
            href={form.phone ? `https://wa.me/${form.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(shareText)}` : waLink(shareText)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
          >
            Send via WhatsApp
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link copied");
            }}
            className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Copy link
          </button>
          <a href={link} target="_blank" rel="noreferrer" className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700">
            View receipt
          </a>
          <button onClick={reset} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
            New receipt
          </button>
        </div>
        {!form.email && <p className="mt-3 text-xs text-stone-400">No client email given — nothing was emailed.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={create} className="grid gap-3 rounded-2xl border border-rose-100 bg-white p-4 sm:grid-cols-2">
      <h2 className="font-semibold text-stone-800 sm:col-span-2">New receipt</h2>
      <label className="text-xs font-semibold text-stone-500">Received from<input required list="past-clients" value={form.client} onChange={set("client")} className={inputCls} placeholder="Client name" /></label>
      <datalist id="past-clients">
        {Array.from(new Set((aData?.receipts || []).map((r) => String(r.client || "").trim()).filter(Boolean))).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <label className="text-xs font-semibold text-stone-500">Client WhatsApp number{isRepeat && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">repeat customer</span>}<input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="e.g. 260971234567" /></label>
      <label className="text-xs font-semibold text-stone-500">Client email (optional — sends a copy)<input type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="client@example.com" /></label>
      <label className="text-xs font-semibold text-stone-500">Area / city<input value={form.area} onChange={set("area")} className={inputCls} placeholder="e.g. Woodlands, Kitwe, Ndola" /></label>
      <label className="text-xs font-semibold text-stone-500">How did they hear?
        <select value={form.heard} onChange={set("heard")} className={inputCls}>
          <option value="">—</option>
          <option>Facebook</option>
          <option>Instagram</option>
          <option>TikTok</option>
          <option>WhatsApp status</option>
          <option>A friend</option>
          <option>Walk-in / saw the shop</option>
          <option>Other</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-stone-500">Method
        <select value={form.method} onChange={set("method")} className={inputCls}>
          <option>Cash</option>
          <option>Cheque</option>
          <option>Mobile money</option>
          <option>Bank transfer</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <span className="text-xs font-semibold text-stone-500">Payment for</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <select value={skuPick} onChange={(e) => setSkuPick(e.target.value)} className="min-w-48 flex-1 rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300">
            <option value="">Pick a style to add…</option>
            {products.map((p) => <option key={p.sku} value={p.sku}>{p.name} ({p.sku}) — K{p.price}</option>)}
          </select>
          <select value={sizePick} onChange={(e) => setSizePick(e.target.value)} className="w-24 rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300">
            <option value="">Size</option>
            {Array.from({ length: 11 }, (_, i) => 35 + i).map((s) => <option key={s}>{s}</option>)}
          </select>
          <button type="button" onClick={addItem} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-300">+ Add</button>
        </div>
        <textarea value={form.items} onChange={set("items")} rows={3} className={`${inputCls} mt-2`} placeholder="e.g. Apricot Floral (18085-33) — EU 35 — K450" />
      </div>
      <label className="text-xs font-semibold text-stone-500">Amount (K)
        <input
          required
          inputMode="numeric"
          value={form.amount}
          onChange={(e) => {
            const amount = e.target.value;
            setForm((f) => ({ ...f, amount, words: amountInWords(parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0) }));
          }}
          className={inputCls}
          placeholder="450"
        />
      </label>
      <label className="text-xs font-semibold text-stone-500">Balance<input value={form.balance} onChange={set("balance")} className={inputCls} placeholder="e.g. K0 or K100" /></label>
      <label className="text-xs font-semibold text-stone-500 sm:col-span-2">Sum of (amount in words)<input value={form.words} onChange={set("words")} className={inputCls} placeholder="Auto-filled from amount" /></label>
      <label className="text-xs font-semibold text-stone-500 sm:col-span-2">Note (optional)<input value={form.note} onChange={set("note")} className={inputCls} placeholder="e.g. deposit paid, balance on collection" /></label>
      <button disabled={saving} className="rounded-lg bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40 sm:col-span-2">
        {saving ? "Creating…" : "Create receipt"}
      </button>
    </form>
  );
}


function AddStylePanel({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    sku: "",
    name: "",
    color: "",
    price: "",
    cat: "matte" as string,
    img: "",
    desc: "",
  });
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = Object.entries(counts)
      .map(([size, count]) => ({ size: Number(size), count: parseInt(count, 10) || 0 }))
      .filter((s) => s.count > 0);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sizes }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        toast.error(d.error || "Create failed");
        return;
      }
      toast.success(`${form.name} (${d.model}) added — live on the shop in ~a minute`);
      onCreated();
    } catch {
      toast.error("Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-rose-100 bg-white p-5 sm:grid-cols-2">
      <p className="text-sm text-stone-500 sm:col-span-2">
        Add a brand-new style to the sheet. Give it a style code (e.g. the supplier model number),
        then set starting stock per size. It appears on the shop within ~a minute.
      </p>
      <label className="text-xs font-semibold text-stone-500">Style code<input required value={form.sku} onChange={set("sku")} className={inputCls} placeholder="e.g. 18085-33" /></label>
      <label className="text-xs font-semibold text-stone-500">Name<input required value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Apricot Floral Heel" /></label>
      <label className="text-xs font-semibold text-stone-500">Colour<input value={form.color} onChange={set("color")} className={inputCls} placeholder="e.g. Apricot" /></label>
      <label className="text-xs font-semibold text-stone-500">Price (K)<input required value={form.price} onChange={set("price")} className={inputCls} placeholder="e.g. 450" /></label>
      <label className="text-xs font-semibold text-stone-500">Category
        <select value={form.cat} onChange={set("cat")} className={inputCls}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-stone-500">Photo path / URL<input value={form.img} onChange={set("img")} className={inputCls} placeholder="/products/image1.jpg or https://…" /></label>
      <label className="text-xs font-semibold text-stone-500 sm:col-span-2">Description<textarea value={form.desc} onChange={set("desc")} rows={2} className={inputCls} placeholder="Optional — shown on the product card" /></label>
      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold text-stone-500">Starting stock per size</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => 35 + i).map((size) => (
            <label key={size} className="flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50/50 px-2 py-1.5 text-sm">
              <span className="w-10 font-semibold text-stone-700">EU {size}</span>
              <input
                type="number" min={0} max={99}
                value={counts[size] || ""}
                onChange={(e) => setCounts({ ...counts, [size]: e.target.value })}
                placeholder="0"
                className="w-12 rounded-lg border border-stone-200 bg-white px-1.5 py-1 text-center outline-none focus:border-rose-300"
              />
            </label>
          ))}
        </div>
      </div>
      <button disabled={saving} className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50 sm:col-span-2">
        {saving ? "Adding…" : "Add style"}
      </button>
    </form>
  );
}

const EU_SIZES = Array.from({ length: 11 }, (_, i) => 35 + i);
const TEMPLATE_HEADER = ["model", "name", "colour", "price", "category", "photo", "description", ...EU_SIZES.map((s) => `EU${s}`)];
const TEMPLATE_ROW = ["18085-33", "Apricot Floral Heel", "Apricot", "450", "matte", "/products/image1.jpg", "", "", "", "", "2", "2", "1", "", "", "", "", ""];

function csvField(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

type CsvItem = {
  sku: string;
  name: string;
  color: string;
  price: string;
  cat: string;
  img: string;
  desc: string;
  sizes: { size: number; count: number }[];
  error?: string;
  done?: boolean;
  serverError?: string;
};

// Header lookup with aliases; size columns match "EU38", "eu38" or bare "38".
function columnMap(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/^eu\s*/, "");
    if (!map.has(key)) map.set(key, i);
  });
  return map;
}

function csvToItem(row: string[], cols: Map<string, number>): CsvItem {
  const get = (names: string[]) => {
    for (const n of names) {
      const i = cols.get(n);
      if (i !== undefined) return (row[i] || "").trim();
    }
    return "";
  };
  const item: CsvItem = {
    sku: get(["model", "sku", "code", "style"]),
    name: get(["name", "title"]),
    color: get(["colour", "color"]),
    price: get(["price", "k"]),
    cat: get(["category", "cat"]),
    img: get(["photo", "img", "image"]),
    desc: get(["description", "desc"]),
    sizes: EU_SIZES.map((size) => ({
      size,
      count: Math.max(0, parseInt(get([String(size)]), 10) || 0),
    })).filter((s) => s.count > 0),
  };
  // Same rules the server enforces, so bad rows are flagged before upload.
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(item.sku)) {
    item.error = "bad style code";
  } else if (!item.name) {
    item.error = "name required";
  } else if (!/^\d{1,7}$/.test(item.price) || !(parseInt(item.price, 10) > 0)) {
    item.error = "price must be a positive whole number";
  } else if (item.sizes.length === 0) {
    item.error = "no stock in any EU35–45 column";
  }
  return item;
}

const BATCH_SIZE = 200; // matches MAX_ITEMS on /api/admin/create-products

function BulkImport({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<CsvItem[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ model: string; ok: boolean; error?: string }[] | null>(null);

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADER, TEMPLATE_ROW].map((r) => r.map(csvField).join(",")).join("\n") + "\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "petalsteps-stock-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      toast.error("No data rows — need a header row plus at least one style");
      setItems(null);
      return;
    }
    const cols = columnMap(rows[0]);
    if (![..."model,sku,code,style".split(",")].some((n) => cols.has(n)) || !cols.has("name") && !cols.has("title")) {
      toast.error("Header row needs at least a model and a name column");
      setItems(null);
      return;
    }
    const parsed = rows.slice(1).map((r) => csvToItem(r, cols));
    // A second row with the same code would always lose to the first — the
    // writer creates one then rejects the rest as "model already exists".
    const seen = new Set<string>();
    parsed.forEach((it) => {
      if (it.error) return;
      if (seen.has(it.sku)) it.error = "duplicate style code in file";
      seen.add(it.sku);
    });
    setItems(parsed);
  };

  const importItems = async () => {
    if (!items) return;
    // Only rows that haven't succeeded — retrying a created model just
    // earns a "model already exists" rejection.
    const pendingIdx = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => !it.error && !it.done)
      .map(({ i }) => i);
    if (pendingIdx.length === 0) return;
    setImporting(true);
    setProgress(0);
    // Track rows by position, not model code (duplicates share a code), and
    // apply each batch's results immediately so a later failure can't drop
    // rows that already landed on the sheet.
    let current = [...items];
    let added = 0;
    let failed = 0;
    let aborted = false;
    try {
      // The API caps at 200 items per request — chunk bigger files.
      for (let off = 0; off < pendingIdx.length; off += BATCH_SIZE) {
        const batchIdx = pendingIdx.slice(off, off + BATCH_SIZE);
        const res = await fetch("/api/admin/create-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batchIdx.map((i) => current[i]) }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.ok) {
          toast.error(d.error || "Import failed");
          aborted = true;
          break;
        }
        const batchResults: { model: string; ok: boolean; error?: string }[] = d.results || [];
        // results[i] answers items[i] — zip by position, never by model.
        batchResults.forEach((r, pos) => {
          const rowIdx = batchIdx[pos];
          if (rowIdx === undefined) return;
          current[rowIdx] = r.ok
            ? { ...current[rowIdx], done: true, serverError: undefined }
            : { ...current[rowIdx], serverError: r.error };
          if (r.ok) added++;
          else failed++;
        });
        setItems([...current]);
        setResults((prev) => [...(prev || []), ...batchResults]);
        setProgress(Math.min(off + BATCH_SIZE, pendingIdx.length));
      }
      const left = current.filter((i) => !i.error && !i.done).length;
      if (!aborted && failed === 0) {
        toast.success(`${added} styles added — live on the shop in ~a minute`);
        if (left === 0) {
          setItems(null);
          onDone();
        }
      } else if (!aborted) {
        toast.error(`${added} added, ${failed} failed — see below`);
      }
    } catch {
      toast.error("Import failed");
      setItems([...current]);
    } finally {
      setImporting(false);
    }
  };

  const valid = items?.filter((i) => !i.error && !i.done).length ?? 0;

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-5">
      <p className="text-sm font-semibold text-stone-700">Bulk import from CSV</p>
      <p className="mt-1 text-sm text-stone-500">
        Adding a whole delivery? Fill the template in Google Sheets or Excel
        (File → Download → CSV) and upload it here — one row per style.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          Download template
        </button>
        <label className="cursor-pointer rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
          Choose CSV…
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-stone-400">{fileName}</span>}
      </div>
      {items && items.length > 0 && (
        <div className="mt-4">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-2">Style code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Pairs</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-mono">{it.sku || "—"}</td>
                    <td className="px-3 py-2">{it.name || "—"}</td>
                    <td className="px-3 py-2">{it.price ? `K${it.price}` : "—"}</td>
                    <td className="px-3 py-2">{it.sizes.reduce((n, s) => n + s.count, 0)}</td>
                    <td
                      className={`px-3 py-2 ${
                        it.done ? "text-emerald-600" : it.error || it.serverError ? "text-red-600" : "text-stone-500"
                      }`}
                    >
                      {it.done ? "added" : it.error || it.serverError || "ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={importing || valid === 0}
            onClick={importItems}
            className="mt-3 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {importing
              ? `Importing ${progress}/${items.filter((i) => !i.error && !i.done).length}…`
              : `Import ${valid} style${valid === 1 ? "" : "s"}`}
          </button>
          {valid < items.filter((i) => !i.done).length && (
            <p className="mt-2 text-xs text-stone-400">{items.filter((i) => !i.done).length - valid} row(s) skipped — fix them in the CSV and re-upload.</p>
          )}
        </div>
      )}
      {results && (
        <ul className="mt-3 space-y-1 text-xs">
          {results.map((r, i) => (
            <li key={i} className={r.ok ? "text-emerald-600" : "text-red-600"}>
              {r.model}: {r.ok ? "added" : r.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditForm({
  product,
  onSaved,
  onCancel,
}: {
  product: Product;
  onSaved: (fields: Partial<Product>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: product.name,
    color: product.color,
    price: String(product.price),
    cat: product.cat,
    img: product.img,
    desc: product.desc,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const price = form.price.trim();
    if (!name) {
      toast.error("Name can't be empty");
      return;
    }
    if (!(parseInt(price.replace(/[^0-9]/g, ""), 10) > 0)) {
      toast.error("Price must be a positive number");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: product.sku,
          name: form.name.trim(),
          color: form.color.trim(),
          price: form.price.trim(),
          cat: form.cat,
          img: form.img.trim(),
          desc: form.desc.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        toast.error(d.error || "Save failed");
        return;
      }
      onSaved({
        name: form.name.trim(),
        color: form.color.trim(),
        price: parseInt(form.price.replace(/[^0-9]/g, ""), 10) || product.price,
        cat: form.cat as Product["cat"],
        img: form.img.trim(),
        desc: form.desc.trim(),
      });
      toast.success(`${form.name.trim() || product.sku} saved`);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300";
  return (
    <form onSubmit={save} className="mt-3 grid gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-stone-500">
        Name
        <input value={form.name} onChange={set("name")} className={input} required />
      </label>
      <label className="text-xs font-semibold text-stone-500">
        Colour
        <input value={form.color} onChange={set("color")} className={input} />
      </label>
      <label className="text-xs font-semibold text-stone-500">
        Price (ZMW)
        <input value={form.price} onChange={set("price")} className={input} inputMode="numeric" required />
      </label>
      <label className="text-xs font-semibold text-stone-500">
        Category
        <select value={form.cat} onChange={set("cat")} className={input}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-stone-500 sm:col-span-2">
        Photo (URL or /products/… path)
        <input value={form.img} onChange={set("img")} className={input} />
      </label>
      <label className="text-xs font-semibold text-stone-500 sm:col-span-2">
        Description
        <textarea value={form.desc} onChange={set("desc")} rows={2} className={input} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={saving}
          className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}


function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-stone-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

function DashboardPanel({ products, analytics, go }: {
  products: Product[];
  analytics: ReturnType<typeof useAnalytics>;
  go: (v: "dashboard" | "stock" | "analytics" | "reports" | "receipts" | "add" | "list") => void;
}) {
  const { data, loading, reload } = analytics;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const log = data?.log || [];
  const receipts = data?.receipts || [];
  const logOk = data ? data.logSupported === true : false;
  const net = netLogRows(log);
  const netSold = (minDay: string) =>
    net.reduce((a, { r, kind, sign }) => (kind === "sold" && dayOf(r.ts) >= minDay ? a + sign : a), 0);
  const soldToday = netSold(today);
  const soldWeek = netSold(weekAgo);
  const tapsToday = log.filter((r) => r.action === "interest" && dayOf(r.ts) === today).length;
  const revToday = receipts
    .filter((r) => dayOf(r.date || "") === today)
    .reduce((a, r) => a + (parseInt(String(r.amount).replace(/[^0-9]/g, ""), 10) || 0), 0);
  const lowStock = products.filter((p) => totalPairs(p) > 0 && totalPairs(p) <= 5);
  // Dead stock only makes sense when the log read actually succeeded —
  // a failed read would mark every stocked style as dead.
  const soldModels = new Set(log.filter((r) => r.action === "sold").map((r) => r.model));
  const deadStock = data && data.logSupported !== false
    ? products.filter((p) => totalPairs(p) > 0 && !soldModels.has(p.sku))
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pairs in stock" value={products.reduce((a, p) => a + totalPairs(p), 0)} hint={`${products.length} styles`} />
        <Kpi label="Pairs sold today" value={logOk ? soldToday : "—"} hint={logOk ? `${soldWeek} in last 7 days` : "log read failed"} />
        <Kpi label="Order taps today" value={logOk ? tapsToday : "—"} hint={logOk ? "WhatsApp orders opened" : "log read failed"} />
        <Kpi label="Revenue today" value={`K${revToday}`} hint={data && !data.receiptsSupported ? "redeploy writer for receipts" : undefined} />
      </div>
      {data && !data.receiptsSupported && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Receipt analytics need the latest stock_writer.gs redeployed (kind=receipts). Sales and subscriber data still work.
        </p>
      )}
      {data && (data.logSupported === false || data.subsSupported === false) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some sheet reads failed — figures below may be incomplete. Try Refresh data.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Low stock alerts</h3>
            <button onClick={() => go("stock")} className="text-xs font-semibold text-rose-500">Open stock →</button>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">Nothing running low — every style has 6+ pairs.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {lowStock.map((p) => (
                <li key={p.sku} className="flex justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-sm">
                  <span className="font-semibold text-stone-700">{p.name} <span className="text-stone-400">({p.sku})</span></span>
                  <span className="font-bold text-amber-600">{totalPairs(p)} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Dead stock</h3>
            <button onClick={() => go("analytics")} className="text-xs font-semibold text-rose-500">Analytics →</button>
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-stone-400">Loading…</p>
          ) : !logOk ? (
            <p className="mt-3 text-sm text-stone-400">Couldn't check — the log read failed. Hit Refresh data.</p>
          ) : deadStock.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">Every stocked style has sold at least once in the log.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {deadStock.map((p) => (
                <li key={p.sku} className="flex justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-sm">
                  <span className="font-semibold text-stone-700">{p.name} <span className="text-stone-400">({p.sku})</span></span>
                  <span className="text-stone-400">no sales logged</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["stock", "analytics", "receipts", "add", "list"] as const).map((v) => (
          <button key={v} onClick={() => go(v)} className="rounded-full border border-rose-200 bg-white px-4 py-1.5 text-sm font-semibold text-stone-600 hover:border-rose-400">
            {v === "add" ? "add style" : v === "list" ? "mailing list" : v} →
          </button>
        ))}
        <button onClick={reload} className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-semibold text-stone-500 hover:border-stone-400">
          Refresh data
        </button>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color = "bg-rose-400" }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 truncate text-stone-500">{label}</span>
      <div className="h-3.5 flex-1 rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-semibold text-stone-700">{value}</span>
    </div>
  );
}

function AnalyticsPanel({ analytics }: { analytics: ReturnType<typeof useAnalytics> }) {
  const { data, loading, reload } = analytics;
  const [range, setRange] = useState(14);
  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-6 text-center">
        <p className="text-sm text-stone-400">{loading ? "Loading analytics…" : "Could not load analytics — check the writer deployment."}</p>
        {!loading && <button onClick={reload} className="mt-3 rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white">Retry</button>}
      </div>
    );
  }
  const from = new Date(Date.now() - (range - 1) * 864e5).toISOString().slice(0, 10);
  // Net over the FULL log, then cut to range — an undo inside the range can
  // still find its original outside it (both drop out) instead of reading as
  // a negative sale. Computed once for all three summaries below.
  const net = netLogRows(data.log).filter(({ r }) => dayOf(r.ts) >= from);
  const receipts = data.receipts.filter((r) => dayOf(r.date || "") >= from);
  const subs = data.subscribers.filter((s) => dayOf(s.ts) >= from);

  const perDay = new Map<string, { sold: number; taps: number }>();
  net.forEach(({ r, kind, sign }) => {
    const d = dayOf(r.ts);
    const e = perDay.get(d) || { sold: 0, taps: 0 };
    if (kind === "sold") e.sold += sign;
    if (kind === "interest") e.taps += 1;
    perDay.set(d, e);
  });
  const days = Array.from({ length: range }, (_, i) => {
    const d = new Date(Date.now() - (range - 1 - i) * 864e5).toISOString().slice(0, 10);
    return { d, ...(perDay.get(d) || { sold: 0, taps: 0 }) };
  });
  const maxDay = Math.max(1, ...days.map((x) => Math.max(x.sold, x.taps)));

  const soldByModel = new Map<string, number>();
  const tapsByModel = new Map<string, number>();
  net.forEach(({ r, kind, sign }) => {
    if (kind === "sold") soldByModel.set(r.model, (soldByModel.get(r.model) || 0) + sign);
    if (kind === "interest") tapsByModel.set(r.model, (tapsByModel.get(r.model) || 0) + 1);
  });
  const topModels = Array.from(new Set([...soldByModel.keys(), ...tapsByModel.keys()]))
    .map((m) => ({ m, sold: soldByModel.get(m) || 0, taps: tapsByModel.get(m) || 0 }))
    .sort((a, b) => b.sold - a.sold || b.taps - a.taps)
    .slice(0, 12);

  const sizeDemand = new Map<number, number>();
  net.forEach(({ r, kind, sign }) => {
    const s = parseInt(r.size, 10);
    if (!(s >= 35 && s <= 45)) return;
    if (kind === "sold" || kind === "interest") sizeDemand.set(s, (sizeDemand.get(s) || 0) + sign);
  });
  const maxSize = Math.max(1, ...sizeDemand.values());

  const payMix = new Map<string, number>();
  receipts.forEach((r) => {
    const m = String(r.method || "—");
    payMix.set(m, (payMix.get(m) || 0) + (parseInt(String(r.amount).replace(/[^0-9]/g, ""), 10) || 0));
  });
  const maxPay = Math.max(1, ...payMix.values());

  // Repeat customers count across ALL receipts (a repeat buyer's first
  // purchase may predate the selected range); only those with a purchase
  // inside the range are listed, so out-of-range-only buyers don't appear.
  const byPhone = new Map<string, { name: string; count: number; inRange: boolean; total: number }>();
  data.receipts.forEach((r) => {
    const ph = String(r.phone || "").replace(/[^0-9+]/g, "");
    if (!ph) return;
    const e = byPhone.get(ph) || { name: String(r.client || ""), count: 0, inRange: false, total: 0 };
    e.count += 1;
    if (dayOf(r.date || "") >= from) {
      e.inRange = true;
      e.total += parseInt(String(r.amount).replace(/[^0-9]/g, ""), 10) || 0;
    }
    byPhone.set(ph, e);
  });
  const repeaters = Array.from(byPhone.entries()).filter(([, v]) => v.count > 1 && v.inRange).sort((a, b) => b[1].total - a[1].total);

  const heardMix = new Map<string, number>();
  net.forEach(({ r }) => {
    const m = /via (.+)$/i.exec(String(r.note || ""));
    if (m) heardMix.set(m[1].trim(), (heardMix.get(m[1].trim()) || 0) + 1);
  });
  receipts.forEach((r) => {
    const h = String(r.heard || "").trim();
    if (h) heardMix.set(h, (heardMix.get(h) || 0) + 1);
  });
  const maxHeard = Math.max(1, ...heardMix.values());

  const areaMix = new Map<string, number>();
  receipts.forEach((r) => {
    const a = String(r.area || "").trim();
    if (a) areaMix.set(a, (areaMix.get(a) || 0) + 1);
  });
  const maxArea = Math.max(1, ...areaMix.values());

  const subsByDay = new Map<string, number>();
  subs.forEach((s) => subsByDay.set(dayOf(s.ts), (subsByDay.get(dayOf(s.ts)) || 0) + 1));
  const maxSubs = Math.max(1, ...subsByDay.values());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-stone-800">Analytics</h2>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setRange(d)} className={`rounded-full px-3 py-1 text-xs font-semibold ${range === d ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600"}`}>
            {d}d
          </button>
        ))}
        <button onClick={reload} className="ml-auto rounded-lg border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-500">Refresh</button>
      </div>
      {!data.receiptsSupported && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Receipt revenue/mix/areas need the latest stock_writer.gs redeployed (kind=receipts). Log + subscriber analytics work now.
        </p>
      )}
      {(data.logSupported === false || data.subsSupported === false) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some sheet reads failed — figures below may be incomplete. Try Refresh.
        </p>
      )}
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Sales trend — sold vs order taps per day</h3>
          <button onClick={() => downloadCsv(`petal-daily-${range}d.csv`, ["date", "sold", "order taps"], days.map((x) => [x.d, x.sold, x.taps]))} className="text-xs font-semibold text-rose-500">Export CSV</button>
        </div>
        <div className="mt-3 space-y-1">
          {days.map((x) => (
            <div key={x.d} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-stone-400">{x.d.slice(5)}</span>
              <div className="flex h-4 flex-1 gap-0.5">
                <div className="rounded bg-rose-400" style={{ width: `${(x.sold / maxDay) * 50}%` }} title={`${x.sold} sold`} />
                <div className="rounded bg-stone-300" style={{ width: `${(x.taps / maxDay) * 50}%` }} title={`${x.taps} taps`} />
              </div>
              <span className="w-16 shrink-0 text-right text-stone-500">{x.sold} / {x.taps}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-400"><span className="inline-block h-2 w-2 rounded bg-rose-400" /> sold · <span className="inline-block h-2 w-2 rounded bg-stone-300" /> order taps (sold / taps)</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Top models — sold vs interest</h3>
            <button onClick={() => downloadCsv(`petal-models-${range}d.csv`, ["model", "sold", "order taps"], topModels.map((t) => [t.m, t.sold, t.taps]))} className="text-xs font-semibold text-rose-500">CSV</button>
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {topModels.map((t) => (
                <tr key={t.m} className="border-t border-rose-50">
                  <td className="py-1.5 font-semibold text-stone-700">{t.m}</td>
                  <td className="py-1.5 text-right">{t.sold}</td>
                  <td className="py-1.5 text-right text-stone-400">{t.taps}</td>
                </tr>
              ))}
              {!topModels.length && <tr><td className="py-4 text-center text-stone-400">No activity in range</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-100 bg-white p-4">
            <h3 className="font-semibold text-stone-800">Size demand (sold + taps)</h3>
            <div className="mt-3 space-y-1">
              {Array.from({ length: 11 }, (_, i) => 35 + i).map((s) => (
                <Bar key={s} label={`EU ${s}`} value={sizeDemand.get(s) || 0} max={maxSize} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-4">
            <h3 className="font-semibold text-stone-800">Subscriber growth ({data.subscribers.length} total)</h3>
            <div className="mt-3 space-y-1">
              {Array.from(subsByDay.entries()).sort().map(([d, n]) => (
                <Bar key={d} label={d.slice(5)} value={n} max={maxSubs} color="bg-emerald-400" />
              ))}
              {!subsByDay.size && <p className="text-sm text-stone-400">No signups in range</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h3 className="font-semibold text-stone-800">Payment mix (K)</h3>
          <div className="mt-3 space-y-1">
            {Array.from(payMix.entries()).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <Bar key={m} label={m} value={v} max={maxPay} color="bg-violet-400" />
            ))}
            {!payMix.size && <p className="text-sm text-stone-400">No receipts in range</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h3 className="font-semibold text-stone-800">Referral source</h3>
          <div className="mt-3 space-y-1">
            {Array.from(heardMix.entries()).sort((a, b) => b[1] - a[1]).map(([h, n]) => (
              <Bar key={h} label={h} value={n} max={maxHeard} color="bg-sky-400" />
            ))}
            {!heardMix.size && <p className="text-sm text-stone-400">None captured yet — appears once clients pick a source at checkout</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h3 className="font-semibold text-stone-800">Areas (from receipts)</h3>
          <div className="mt-3 space-y-1">
            {Array.from(areaMix.entries()).sort((a, b) => b[1] - a[1]).map(([a, n]) => (
              <Bar key={a} label={a} value={n} max={maxArea} color="bg-amber-400" />
            ))}
            {!areaMix.size && <p className="text-sm text-stone-400">Fill the Area field on receipts to map demand</p>}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Repeat customers ({repeaters.length})</h3>
          <button onClick={() => downloadCsv("petal-repeat-customers.csv", ["phone", "name", "receipts", "total K"], repeaters.map(([ph, v]) => [ph, v.name, v.count, v.total]))} className="text-xs font-semibold text-rose-500">CSV</button>
        </div>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {repeaters.slice(0, 10).map(([ph, v]) => (
              <tr key={ph} className="border-t border-rose-50">
                <td className="py-1.5 font-semibold text-stone-700">{v.name}</td>
                <td className="py-1.5 text-stone-400">{ph}</td>
                <td className="py-1.5 text-right">{v.count} receipts</td>
                <td className="py-1.5 text-right font-semibold">K{v.total}</td>
              </tr>
            ))}
            {!repeaters.length && <tr><td className="py-4 text-center text-stone-400">No repeat customers yet (matched by phone)</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Lead = { model: string; size: string; taps: number; lastTs: string };

// Order taps that never became a sale — unfilled demand to follow up on
// or restock. Matches each lead to its product for name + stock status.
function LeadsPanel({ products }: { products: Product[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  const load = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setState("failed");
        return;
      }
      const list = (data.leads || []) as Lead[];
      list.sort((a, b) => b.taps - a.taps || String(b.lastTs).localeCompare(String(a.lastTs)));
      setLeads(list);
      setState("ready");
    } catch {
      setState("failed");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const productOf = (model: string) => products.find((p) => p.sku === model);
  const stocked = (l: Lead) => {
    const p = productOf(l.model);
    const s = parseInt(l.size, 10);
    return p ? (p.stock[s] || 0) > 0 : false;
  };

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-stone-800">Order taps without a sale</h2>
        {state === "ready" && (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
            {leads.length} open {leads.length === 1 ? "lead" : "leads"}
          </span>
        )}
        <button
          onClick={() =>
            downloadCsv(
              "leads.csv",
              ["model", "size", "taps", "last tap"],
              leads.map((l) => [l.model, l.size, l.taps, l.lastTs])
            )
          }
          disabled={!leads.length}
          className="ml-auto rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-400">
        A tap counts as filled once the same style+size is later marked sold — these are the open ones.
      </p>
      {state === "loading" ? (
        <p className="mt-4 text-sm text-stone-400">Loading…</p>
      ) : state === "failed" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Couldn&apos;t load leads — the writer needs the latest stock_writer.gs (kind=leads).
          <button onClick={load} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : leads.length === 0 ? (
        <p className="mt-4 text-sm text-stone-400">No open leads — every order tap so far became a sale.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="pb-1">Style</th><th className="pb-1">Size</th><th className="pb-1 text-right">Taps</th>
              <th className="pb-1 text-right">Last tap</th><th className="pb-1 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const p = productOf(l.model);
              const has = stocked(l);
              return (
                <tr key={`${l.model}-${l.size}`} className="border-t border-rose-50">
                  <td className="py-1.5 font-semibold text-stone-700">{p?.name || l.model} <span className="font-normal text-stone-400">{l.model}</span></td>
                  <td className="py-1.5 text-stone-500">EU {l.size}</td>
                  <td className="py-1.5 text-right font-semibold text-rose-500">{l.taps}</td>
                  <td className="py-1.5 text-right text-stone-400">{String(l.lastTs).slice(0, 10)}</td>
                  <td className="py-1.5 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${has ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {has ? "in stock — follow up" : "sold out — restock"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Compose + send a newsletter to every subscriber. The template wraps the
// message + featured styles in the brand frame; the writer sends via MailApp
// and reports sent/failed/remaining (Gmail caps ~100 recipients/day).
function NewsletterPanel({ products }: { products: Product[] }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number; remaining: number } | null>(null);

  const inStock = products.filter((p) => totalPairs(p) > 0);
  const featured = picked.map((sku) => products.find((p) => p.sku === sku)).filter(Boolean) as Product[];
  const toggle = (sku: string) =>
    setPicked((s) => (s.includes(sku) ? s.filter((x) => x !== sku) : s.length >= 4 ? s : [...s, sku]));

  const site = typeof window === "undefined" ? "" : window.location.origin;
  const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Attribute values also need quotes escaped — a crafted product URL could
  // otherwise break out of src="…" into new attributes.
  const escAttr = (s: string) => escHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  // Sheet photos can be relative (/products/…) or absolute — don't prefix
  // absolute URLs with the site origin.
  const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : site + u);
  const paragraphs = message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const html = `<!doctype html><html><body style="margin:0;background:#fff7f8;font-family:Georgia,serif;color:#44403c">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="text-align:center">
    <img src="${site}/brand/logo.jpg" alt="Petal Steps" width="72" style="border-radius:16px"/>
    <h1 style="font-size:22px;color:#f43f5e;margin:8px 0 0">Petal Steps</h1>
  </div>
  <div style="background:#ffffff;border:1px solid #ffe4e6;border-radius:16px;padding:20px;margin-top:16px">
    ${subject ? `<h2 style="margin:0 0 12px;font-size:18px;color:#1c1917">${escHtml(subject)}</h2>` : ""}
    ${paragraphs.map((p) => `<p style="font-size:14px;line-height:1.6;margin:0 0 10px">${escHtml(p).replace(/\n/g, "<br/>")}</p>`).join("")}
    ${featured.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr>${featured.map((p) => `<td align="center" style="padding:4px"><img src="${escAttr(abs(p.img))}" alt="${escAttr(p.name)}" width="120" style="border-radius:12px;display:block"/><div style="font-size:12px;margin-top:6px">${escHtml(p.name)}</div><div style="font-size:12px;font-weight:bold;color:#f43f5e">K${p.price}</div></td>`).join("")}</tr></table>` : ""}
    <p style="text-align:center;margin:20px 0 0"><a href="${site}" style="background:#f43f5e;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:bold">Shop the collection</a></p>
  </div>
  <p style="text-align:center;font-size:11px;color:#a8a29e;margin-top:16px">
    Petal Steps · Munali Rd 4774, Lusaka · You&apos;re getting this because you joined the Petal List.<br/>
    Reply STOP to unsubscribe, or order on WhatsApp +260 760 732 751.
  </p>
</div></body></html>`;
  const text = [
    "PETAL STEPS" + (subject ? " — " + subject : ""),
    ...paragraphs,
    featured.map((p) => `· ${p.name} — K${p.price}`).join("\n"),
    "Shop: " + site,
    "WhatsApp orders: +260 760 732 751",
    "Reply STOP to unsubscribe.",
  ].filter((s) => s !== "").join("\n\n");

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (!window.confirm("Send to ALL subscribers now? This can't be undone.")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Send failed");
        return;
      }
      setResult({ total: data.total, sent: data.sent, failed: data.failed, remaining: data.remaining });
      toast.success(`Sent to ${data.sent} subscriber${data.sent === 1 ? "" : "s"}`);
    } catch {
      toast.error("Send failed — network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <h2 className="font-semibold text-stone-800">Newsletter</h2>
        <p className="mt-1 text-xs text-stone-400">
          Goes to every Petal List subscriber. Gmail sends ~100/day — if the list is bigger the rest go tomorrow (rerun the send).
        </p>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject — e.g. New arrivals just landed"
          className={`${inputCls} mt-3`}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={"Write the message…\n\nBlank lines split paragraphs. Keep it short and warm."}
          rows={6}
          className={`${inputCls} mt-2 resize-y`}
        />
        <p className="mt-3 text-xs font-semibold text-stone-500">Feature up to 4 in-stock styles (tap to add):</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {inStock.slice(0, 24).map((p) => (
            <button
              key={p.sku}
              onClick={() => toggle(p.sku)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                picked.includes(p.sku)
                  ? "border-rose-400 bg-rose-50 text-rose-600"
                  : "border-stone-200 bg-white text-stone-500 hover:border-rose-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button
          onClick={send}
          disabled={sending}
          className="mt-4 rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send to all subscribers"}
        </button>
        {result && (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {result.sent} sent{result.failed ? ` · ${result.failed} failed` : ""}
            {result.remaining ? ` · ${result.remaining} left for tomorrow (Gmail daily quota)` : ""}
            {" · "}list total {result.total}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-600">Preview</h3>
        <iframe title="Newsletter preview" sandbox="" srcDoc={html} className="mt-2 h-[480px] w-full rounded-xl border border-stone-100" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [configured, setConfigured] = useState(true);
  const [source, setSource] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [passcode, setPasscode] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [editing, setEditing] = useState("");
  const [view, setView] = useState<"dashboard" | "stock" | "analytics" | "reports" | "receipts" | "add" | "list" | "newsletter" | "leads">("dashboard");
  const analytics = useAnalytics();

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products?all=1", { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products || []);
    setSource(data.source || "");
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const s = await res.json();
      setConfigured(s.configured);
      if (s.authed) {
        await loadProducts();
        setState("ready");
      } else setState("login");
    })();
  }, [loadProducts]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      await loadProducts();
      setState("ready");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Login failed");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setState("login");
  };

  const adjust = async (p: Product, size: number, delta: number, undo = false) => {
    const key = `${p.sku}-${size}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/sold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: p.sku, size, delta, undo }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        toast.error(d.error || "Update failed");
        return;
      }
      setProducts((ps) =>
        ps.map((q) =>
          q.sku !== p.sku
            ? q
            : {
                ...q,
                stock: d.count > 0
                  ? { ...q.stock, [size]: d.count }
                  : Object.fromEntries(Object.entries(q.stock).filter(([s]) => Number(s) !== size)),
              }
        )
      );
      // No Undo offered on an undo write — undo-of-undo can't be
      // expressed in the log and would corrupt the net counts.
      toast.success(`${p.name} EU ${size}: ${d.previous} → ${d.count}`,
        undo ? undefined : { action: { label: "Undo", onClick: () => adjust(p, size, -delta, true) } });
    } catch {
      toast.error("Update failed");
    } finally {
      setBusyKey("");
    }
  };

  if (state === "loading") {
    return <main className="mx-auto w-[min(720px,92%)] py-16 text-center text-stone-500">Loading…</main>;
  }

  if (!configured) {
    return (
      <main className="mx-auto w-[min(720px,92%)] py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800">Admin not configured</h1>
        <p className="mt-3 text-stone-500">
          Set <code>ADMIN_PASSCODE</code>, <code>STOCK_WRITER_URL</code> and{" "}
          <code>STOCK_WRITER_TOKEN</code> in the environment, then redeploy.
        </p>
      </main>
    );
  }

  if (state === "login") {
    return (
      <main className="mx-auto w-[min(420px,92%)] py-16">
        <Image src="/brand/logo-mark.png" alt="Petal Steps by Thandiwe Mwaba" width={1013} height={552} className="h-16 w-auto" />
        <h1 className="mt-3 font-script text-3xl text-rose-500">Stock admin</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in to mark sizes sold or restock.</p>
        <form onSubmit={login} className="mt-6 flex gap-2">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="flex-1 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none focus:border-rose-300"
            autoFocus
          />
          <button className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(1180px,94%)] py-8">
      <div className="flex items-center gap-3">
        <Image src="/brand/logo.jpg" alt="Petal Steps" width={1080} height={1080} className="h-10 w-10 rounded-full" />
        <h1 className="font-script text-3xl text-rose-500">Stock admin</h1>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
          {products.length} styles · {products.reduce((a, p) => a + totalPairs(p), 0)} pairs ·{" "}
          {source === "sheet" ? "live sheet" : "fallback catalogue"}
        </span>
        <button onClick={logout} className="ml-auto text-sm font-semibold text-stone-500 hover:text-rose-500">
          Sign out
        </button>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2">
        {(["dashboard", "stock", "analytics", "add", "reports", "receipts", "list", "newsletter", "leads"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              view === v ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {v === "add" ? "add style" : v === "list" ? "mailing list" : v}
          </button>
        ))}
      </nav>
      {view === "dashboard" && (
        <div className="mt-6"><DashboardPanel products={products} analytics={analytics} go={setView} /></div>
      )}
      {view === "analytics" && (
        <div className="mt-6"><AnalyticsPanel analytics={analytics} /></div>
      )}
      {view === "add" && (
        <div className="mt-6">
          <AddStylePanel
            onCreated={async () => {
              await loadProducts();
              setView("stock");
            }}
          />
          <div className="mt-4">
            <BulkImport
              onDone={async () => {
                await loadProducts();
                setView("stock");
              }}
            />
          </div>
        </div>
      )}
      {view === "reports" && <div className="mt-6"><ReportsPanel /></div>}
      {view === "receipts" && <div className="mt-6"><ReceiptPanel products={products} /></div>}
      {view === "list" && <div className="mt-6"><SubscribersPanel /></div>}
      {view === "newsletter" && <div className="mt-6"><NewsletterPanel products={products} /></div>}
      {view === "leads" && <div className="mt-6"><LeadsPanel products={products} /></div>}
      {source !== "sheet" && view === "stock" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          The shop is on the fallback catalogue — stock writes still go to the sheet, but the site
          won't reflect them until PRODUCTS_SHEET_CSV_URL works again.
        </p>
      )}
      {view === "stock" && <div className="mt-6 space-y-3">
        {products.map((p) => (
          <section key={p.sku} className="rounded-2xl border border-rose-100 bg-white p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.img}
                alt={p.name}
                className="h-16 w-16 shrink-0 rounded-xl border border-rose-100 object-cover"
              />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-semibold text-stone-800">{p.name}</h2>
                <span className="text-xs text-stone-400">
                  {p.sku} · {p.color} · K{p.price}
                </span>
              </div>
              <button
                onClick={() => setEditing(editing === p.sku ? "" : p.sku)}
                className="ml-auto rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200"
              >
                {editing === p.sku ? "Close" : "Edit"}
              </button>
            </div>
            {editing === p.sku && (
              <EditForm
                product={p}
                onCancel={() => setEditing("")}
                onSaved={(fields) => {
                  setProducts((ps) =>
                    ps.map((q) => (q.sku === p.sku ? { ...q, ...fields } : q))
                  );
                  setEditing("");
                }}
              />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, i) => 35 + i).map((size) => {
                const count = p.stock[size] ?? 0;
                const key = `${p.sku}-${size}`;
                return (
                  <div
                    key={size}
                    className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-sm ${
                      count > 0 ? "border-rose-200 bg-rose-50" : "border-stone-200 bg-stone-50 opacity-60"
                    }`}
                  >
                    <span className="w-12 font-semibold text-stone-700">
                      EU{size} <span className="font-normal text-stone-400">×{count}</span>
                    </span>
                    <button
                      disabled={busyKey === key || count === 0}
                      onClick={() => adjust(p, size, -1)}
                      title="Mark one sold"
                      className="h-7 w-7 rounded-lg bg-rose-500 font-bold text-white hover:bg-rose-600 disabled:opacity-30"
                    >
                      −
                    </button>
                    <button
                      disabled={busyKey === key}
                      onClick={() => adjust(p, size, +1)}
                      title="Restock one"
                      className="h-7 w-7 rounded-lg bg-stone-200 font-bold text-stone-700 hover:bg-stone-300 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>}
    </main>
  );
}
