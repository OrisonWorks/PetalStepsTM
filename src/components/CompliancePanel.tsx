"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type RegisterRow = {
  receipt_no: string; issue_date: string; period: string; status: string;
  client?: string; amount?: string | number; items?: string; notes?: string;
};
type ExceptionRow = {
  id: string; period: string; receipt_no?: string; type: string;
  severity: string; details: string; status: string; resolution?: string;
};
type PeriodRow = {
  period: string; status: string; gross_turnover: string; receipt_count: string;
  exception_count: string; calculated_tax: string; ack_ref?: string; payment_ref?: string;
};
type ComplianceData = {
  register: RegisterRow[]; exceptions: ExceptionRow[]; periods: PeriodRow[];
  evidence: { period: string; type: string; name: string; content_url?: string }[];
};

const fieldCls = "w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300";
const previousPeriod = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

export function CompliancePanel() {
  const { ask } = useConfirm();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [period, setPeriod] = useState(previousPeriod);
  const [receiptNo, setReceiptNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [client, setClient] = useState("");
  const [items, setItems] = useState("");
  const [status, setStatus] = useState("valid");
  const [exception, setException] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/compliance", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not load compliance data");
      setData({ register: json.register || [], exceptions: json.exceptions || [], periods: json.periods || [], evidence: json.evidence || [] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load compliance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = data?.register.filter((r) => r.period === period) || [];
  const open = data?.exceptions.filter((e) => e.period === period && e.status !== "resolved") || [];
  const gross = current.filter((r) => r.status === "valid").reduce((n, r) => n + (Number(r.amount) || 0), 0);
  const planningTax = gross > 2500 ? Math.round((gross - 2500) * 0.05) : 0;
  const gaps = useMemo(() => {
    const series = new Map<string, number[]>();
    current.forEach((r) => {
      const raw = String(r.receipt_no).trim();
      const match = /^([^\d]*)(\d+)$/.exec(raw);
      if (!match) return;
      const key = match[1].toUpperCase() || "PHYSICAL";
      const nums = series.get(key) || [];
      nums.push(parseInt(match[2], 10));
      series.set(key, nums);
    });
    const out: string[] = [];
    series.forEach((values, key) => {
      const nums = [...new Set(values)].sort((a, b) => a - b);
      for (let n = nums[0]; n <= nums[nums.length - 1]; n++) {
        if (!nums.includes(n)) out.push(`${key === "PHYSICAL" ? "" : key + "-"}${String(n).padStart(4, "0")}`);
      }
    });
    return out;
  }, [current]);

  const post = async (action: string, fields: Record<string, string | number>) => {
    const res = await fetch("/api/admin/compliance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, fields }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || "Compliance write failed");
    await load();
  };

  const addReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await ask({ title: `Register receipt ${receiptNo}?`, body: "Receipt numbers are permanent and cannot be reused.", confirmLabel: "Register receipt" }))) return;
    try {
      await post("registerReceipt", { receiptNo, issueDate, period, status, amount, client, items });
      setReceiptNo(""); setIssueDate(""); setAmount(""); setClient(""); setItems("");
      toast.success("Receipt registered");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not register receipt"); }
  };

  const addException = async () => {
    if (!exception.trim()) return;
    try {
      await post("recordReceiptException", { period, type: "manual_review", severity: "review", details: exception });
      setException(""); toast.success("Exception recorded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not record exception"); }
  };

  const syncReceipts = async () => {
    try {
      const res = await fetch("/api/admin/compliance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "syncReceiptRegister", fields: {} }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not sync receipts");
      await load();
      toast.success(`${json.added || 0} existing receipts added to the register`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not sync receipts"); }
  };

  const resolve = async (row: ExceptionRow) => {
    const resolution = window.prompt("Verified resolution for this exception:");
    if (!resolution?.trim()) return;
    try {
      await post("resolveReceiptException", { id: row.id, resolution });
      toast.success("Exception resolved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not resolve exception"); }
  };

  const exportFilingPack = () => {
    const esc = (v: unknown) => {
      const value = String(v ?? "");
      const safe = /^[=+\-@]/.test(value) ? "'" + value : value;
      return `"${safe.replace(/"/g, "\"\"")}"`;
    };
    const rows = current.map((r) => [r.receipt_no, r.issue_date, r.status, r.client || "", r.amount || "", r.items || "", r.notes || ""].map(esc).join(","));
    const csv = ["receipt_no,issue_date,status,client,amount,items,notes", ...rows].join("\n");
    const download = (name: string, content: string, type: string) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content], { type }));
      a.download = name; a.click(); URL.revokeObjectURL(a.href);
    };
    const memo = `<!doctype html><meta charset="utf-8"><title>Petal Steps filing memo ${period}</title>
      <style>body{font:14px Arial;max-width:760px;margin:40px auto;color:#332b2b}h1{text-align:center} .line{border-bottom:1px solid #777;display:inline-block;min-width:260px}</style>
      <h1>Petal Steps — Internal Filing Memo</h1>
      <p>Date: <span class="line">&nbsp;</span></p>
      <p>Period: <b>${period}</b></p>
      <p>Receipt exceptions were reviewed against the available receipt register. The attached ledger is the source for the period review.</p>
      <p>Gross registered valid receipts: <b>K${gross.toLocaleString()}</b></p>
      <p>Open exceptions at export: <b>${open.length}</b></p>
      <p>Missing or unverified receipt pages must not be reconstructed. Attach supporting evidence and record the verified resolution in the Compliance tab.</p>
      <p>Prepared by: <span class="line">&nbsp;</span></p><p>Signature: <span class="line">&nbsp;</span></p>`;
    download(`petalsteps-${period}-receipt-ledger.csv`, csv, "text/csv");
    download(`petalsteps-${period}-filing-memo.html`, memo, "text/html");
    toast.success("Filing ledger and memo downloaded");
  };

  const closePeriod = async () => {
    if (open.length && !(await ask({ title: "Close period with open exceptions?", body: `${open.length} exception(s) are unresolved. The period will remain reviewable, not approved.`, confirmLabel: "Save review" }))) return;
    try {
      await post("closeFilingPeriod", {
        period, status: open.length ? "review" : "approved", grossTurnover: gross,
        receiptCount: current.length, exceptionCount: open.length, calculatedTax: planningTax,
        taxMethod: "5% above K2,500 planning method", approvedBy: open.length ? "" : "Admin review",
      });
      toast.success(open.length ? "Period saved for review" : "Period approved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save period"); }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="text-xs font-semibold text-stone-500">Filing period</label><input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={fieldCls} /></div>
        <button onClick={() => void load()} className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">Refresh</button>
        <button onClick={() => void syncReceipts()} className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">Sync issued receipts</button>
        <button onClick={exportFilingPack} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white">Export filing pack</button>
      </div>
      {loading && <p className="text-sm text-stone-500">Loading compliance records…</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Registered receipts" value={current.length} />
        <Kpi label="Gross valid receipts" value={`K${gross.toLocaleString()}`} />
        <Kpi label="Open exceptions" value={open.length} warn={open.length > 0} />
        <Kpi label="Planning tax only" value={`K${planningTax.toLocaleString()}`} warn />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        This is a preparation aid, not a ZRA filing decision. Confirm the amount calculated by TaxOnline or your accountant before payment.
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <h2 className="font-semibold text-stone-800">Register a physical or digital receipt</h2>
        <form onSubmit={addReceipt} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input required placeholder="Receipt no. e.g. 010" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className={fieldCls} />
          <input required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={fieldCls} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls}><option value="valid">Valid sale</option><option value="unused">Unused</option><option value="void">Void</option><option value="reissued">Reissued</option><option value="needs_review">Needs review</option></select>
          <input placeholder="Customer (optional)" value={client} onChange={(e) => setClient(e.target.value)} className={fieldCls} />
          <input inputMode="numeric" placeholder="Amount K" value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldCls} />
          <input placeholder="Item description" value={items} onChange={(e) => setItems(e.target.value)} className={fieldCls} />
          <button className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white sm:col-span-3">Register receipt</button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h2 className="font-semibold text-stone-800">Sequence and data-quality warnings</h2>
          {gaps.length > 0 && <p className="mt-2 text-sm text-amber-700">Missing within each receipt series: {gaps.join(", ")}</p>}
          {open.length === 0 && gaps.length === 0 ? <p className="mt-2 text-sm text-emerald-700">No open warnings for this period.</p> : null}
          <div className="mt-3 space-y-2">{open.map((e) => <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 p-2 text-sm"><span><b>{e.receipt_no || "Period"}</b> · {e.type}: {e.details}</span><button onClick={() => void resolve(e)} className="shrink-0 rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-700">Resolve</button></div>)}</div>
          <div className="mt-3 flex gap-2"><input value={exception} onChange={(e) => setException(e.target.value)} placeholder="Record a verified exception…" className={fieldCls} /><button onClick={() => void addException()} className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-white">Add</button></div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h2 className="font-semibold text-stone-800">Monthly close</h2>
          <p className="mt-2 text-sm text-stone-500">Save a review when evidence is incomplete. Approve only after every exception is resolved.</p>
          <button onClick={() => void closePeriod()} className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white">{open.length ? "Save period for review" : "Approve period"}</button>
          <div className="mt-4 space-y-1 text-sm text-stone-600">{(data?.periods || []).filter((p) => p.period === period).map((p) => <p key={p.period}>Status: <b>{p.status}</b> · Last saved gross: K{Number(p.gross_turnover || 0).toLocaleString()}</p>)}</div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) {
  return <div className={`rounded-xl border p-3 ${warn ? "border-amber-200 bg-amber-50" : "border-rose-100 bg-white"}`}><div className="text-xs text-stone-500">{label}</div><div className="mt-1 text-xl font-bold text-stone-800">{value}</div></div>;
}
