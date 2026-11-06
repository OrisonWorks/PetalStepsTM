import { after } from "next/server";

// Server-side audit trail: appends a LOG row for admin writes the stock path
// doesn't already record (edits, new styles, receipts, opt-outs). Scheduled via
// next/server after() so it never delays the primary write's response. Best-
// effort — a stale writer that rejects the event name just skips the row;
// failures are swallowed so an audit miss never fails the real write.
export function auditWrite(
  event: "edit" | "create" | "receipt" | "unsubscribe",
  model: string,
  note: string
) {
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) return;
  after(async () => {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "logEvent",
          event,
          model: model || "-",
          note: note.slice(0, 300),
        }),
        cache: "no-store",
      });
    } catch {
      // Audit is best-effort — the primary write already succeeded.
    }
  });
}
