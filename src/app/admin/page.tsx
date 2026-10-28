"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { totalPairs } from "@/lib/products";
import { amountInWords } from "@/lib/money-words";
import { waLink } from "@/lib/utils";

const CATEGORIES = ["matte", "glossy", "statement", "red-bottom"] as const;

const inputCls =
  "w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300";

type LogRow = { ts: string; action: string; model: string; size: string; note: string };

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

  const sold = rows.filter((r) => r.action === "sold");
  const interest = rows.filter((r) => r.action === "interest");
  const restock = rows.filter((r) => r.action === "restock");
  const byModel = new Map<string, number>();
  sold.forEach((r) => byModel.set(r.model, (byModel.get(r.model) || 0) + 1));
  const interestByModel = new Map<string, number>();
  interest.forEach((r) => interestByModel.set(r.model, (interestByModel.get(r.model) || 0) + 1));

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
              <strong className="block text-2xl text-rose-600">{sold.length}</strong>
              <span className="text-xs text-stone-500">pairs sold</span>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <strong className="block text-2xl text-stone-700">{interest.length}</strong>
              <span className="text-xs text-stone-500">order taps</span>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <strong className="block text-2xl text-stone-700">{restock.length}</strong>
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
              {sold.length === 0 && interest.length === 0 && (
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
  });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState("");
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
      setCreated(d.no);
      toast.success(`Receipt ${d.no} created${d.emailed ? " and emailed" : ""}`);
    } catch {
      toast.error("Receipt failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCreated("");
    setForm({ client: "", phone: "", email: "", items: "", amount: "", words: "", method: "Cash", balance: "", note: "" });
  };

  if (created) {
    const link = `${window.location.origin}/receipt/${created}`;
    const shareText = `Your Petal Steps receipt ${created} — ${link}`;
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-6 text-center">
        <p className="text-sm text-stone-500">Receipt created</p>
        <p className="font-display mt-1 text-3xl font-semibold text-rose-600">{created}</p>
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
          <a href={`/receipt/${created}`} target="_blank" rel="noreferrer" className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700">
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
      <label className="text-xs font-semibold text-stone-500">Received from<input required value={form.client} onChange={set("client")} className={inputCls} placeholder="Client name" /></label>
      <label className="text-xs font-semibold text-stone-500">Client WhatsApp number<input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="e.g. 260971234567" /></label>
      <label className="text-xs font-semibold text-stone-500">Client email (optional — sends a copy)<input type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="client@example.com" /></label>
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

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [configured, setConfigured] = useState(true);
  const [source, setSource] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [passcode, setPasscode] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [editing, setEditing] = useState("");
  const [view, setView] = useState<"stock" | "reports" | "receipts">("stock");

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

  const adjust = async (p: Product, size: number, delta: number) => {
    const key = `${p.sku}-${size}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/sold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: p.sku, size, delta }),
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
      toast.success(`${p.name} EU ${size}: ${d.previous} → ${d.count}`);
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
        <h1 className="font-script text-3xl text-rose-500">Petal Steps — stock admin</h1>
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
        <h1 className="font-script text-3xl text-rose-500">Stock admin</h1>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
          {products.length} styles · {products.reduce((a, p) => a + totalPairs(p), 0)} pairs ·{" "}
          {source === "sheet" ? "live sheet" : "fallback catalogue"}
        </span>
        <button onClick={logout} className="ml-auto text-sm font-semibold text-stone-500 hover:text-rose-500">
          Sign out
        </button>
      </div>
      <nav className="mt-4 flex gap-2">
        {(["stock", "reports", "receipts"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              view === v ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {v}
          </button>
        ))}
      </nav>
      {view === "reports" && <div className="mt-6"><ReportsPanel /></div>}
      {view === "receipts" && <div className="mt-6"><ReceiptPanel products={products} /></div>}
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
