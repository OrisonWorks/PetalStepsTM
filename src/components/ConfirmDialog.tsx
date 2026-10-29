"use client";
import { useCallback, useEffect, useState } from "react";

export type ConfirmRequest = {
  title: string;
  body?: string;
  confirmLabel?: string;
};

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

// One shared "are you sure?" modal for every admin mutation. `ask` resolves
// true on confirm, false on cancel/Esc/backdrop.
export function useConfirm() {
  const [req, setReq] = useState<Pending | null>(null);

  const ask = useCallback(
    (r: ConfirmRequest) => new Promise<boolean>((resolve) => setReq({ ...r, resolve })),
    []
  );

  const settle = useCallback(
    (ok: boolean) => {
      setReq((cur) => {
        cur?.resolve(ok);
        return null;
      });
    },
    []
  );

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, settle]);

  const dialog = req ? (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => settle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={req.title}
        className="w-full max-w-sm rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-stone-800">{req.title}</h3>
        {req.body && <p className="mt-2 text-sm leading-relaxed text-stone-500">{req.body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          >
            {req.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}
