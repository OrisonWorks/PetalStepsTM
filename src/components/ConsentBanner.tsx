"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PS_CONSENT_KEY } from "@/lib/consent";

// One-time banner shown until the visitor picks Accept or Decline. It covers
// storing the checkout name + number for order follow-up — the site itself
// uses no tracking cookies (cart + this choice live in localStorage).
export function ConsentBanner() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(PS_CONSENT_KEY)) setPending(true);
    } catch {
      setPending(true);
    }
  }, []);
  if (!pending) return null;
  const choose = (v: "yes" | "no") => {
    try {
      window.localStorage.setItem(PS_CONSENT_KEY, v);
    } catch {}
    setPending(false);
  };
  return (
    <div role="dialog" aria-label="Privacy notice" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="text-sm font-semibold text-stone-800">Quick privacy note 🌸</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        We don&apos;t use tracking cookies. When you order, the name and WhatsApp number you type may be saved so we can follow up on your order — your details stay between you and this shop. Orders go through WhatsApp either way.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="rounded-full" onClick={() => choose("yes")}>That&apos;s fine</Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => choose("no")}>No thanks</Button>
      </div>
    </div>
  );
}
