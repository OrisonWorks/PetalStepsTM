"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

const fieldCls = "w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300";

export function DigestPanel() {
  const { ask } = useConfirm();
  const [emails, setEmails] = useState("");
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/digest", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not load digest settings");
      setEmails(String(json.reportEmails || ""));
      setDailyEnabled(Boolean(json.dailyEnabled));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load digest settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateDigestSettings", fields: { emails, dailyEnabled } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save digest settings");
      setEmails(String(json.reportEmails || emails));
      setDailyEnabled(Boolean(json.dailyEnabled));
      toast.success("Digest settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save digest settings");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!(await ask({
      title: "Send a digest test email?",
      body: "This sends a real email to every configured recipient.",
      confirmLabel: "Send test",
    }))) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendDigestTest", fields: {} }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not send digest test");
      toast.success(`Test sent to ${json.reportEmails}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send digest test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">Sales digest</h2>
        <p className="mt-1 text-sm text-stone-500">
          Configure daily sales emails without opening Apps Script. Separate addresses with commas.
        </p>
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        {loading ? <p className="text-sm text-stone-500">Loading digest settings…</p> : (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-stone-700">
              Recipients
              <input
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="name@example.com,other@example.com"
                className={`${fieldCls} mt-1`}
                autoComplete="email"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={dailyEnabled} onChange={(e) => setDailyEnabled(e.target.checked)} />
              Send the daily digest automatically at about 21:00
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save digest settings"}
              </button>
              <button type="button" disabled={saving} onClick={() => void sendTest()} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Send test email
              </button>
            </div>
            <p className="text-xs text-stone-500">
              The test sends a real email. Saving replaces the `REPORT_EMAILS` setting and enables or disables the daily trigger.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
