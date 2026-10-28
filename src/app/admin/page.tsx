"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { totalPairs } from "@/lib/products";

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [configured, setConfigured] = useState(true);
  const [source, setSource] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [passcode, setPasscode] = useState("");
  const [busyKey, setBusyKey] = useState("");

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
      {source !== "sheet" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          The shop is on the fallback catalogue — stock writes still go to the sheet, but the site
          won't reflect them until PRODUCTS_SHEET_CSV_URL works again.
        </p>
      )}
      <div className="mt-6 space-y-3">
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
            </div>
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
      </div>
    </main>
  );
}
