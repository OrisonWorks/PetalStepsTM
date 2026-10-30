"use client";
import { useState } from "react";

/** Slice `items` into pages; returns the current slice + controls state. */
export function usePager<T>(items: T[], per = 10) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / per));
  const cur = Math.min(page, pages - 1); // clamps when the list shrinks
  return { page: cur, pages, setPage, slice: items.slice(cur * per, cur * per + per) };
}

/** Prev/next + numbered page buttons; renders nothing for a single page. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const btn = "rounded-lg border px-2.5 py-1 text-xs font-semibold";
  return (
    <nav className="mt-3 flex items-center justify-center gap-1" aria-label="Pagination">
      <button disabled={page === 0} onClick={() => onPage(page - 1)} className={`${btn} border-stone-200 text-stone-500 hover:border-rose-200 disabled:opacity-30`}>‹</button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-xs text-stone-400">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${n === page ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200 text-stone-500 hover:border-rose-200"}`}
          >
            {n + 1}
          </button>
        )
      )}
      <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className={`${btn} border-stone-200 text-stone-500 hover:border-rose-200 disabled:opacity-30`}>›</button>
    </nav>
  );
}
