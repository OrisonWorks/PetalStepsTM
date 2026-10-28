import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

// Creates a receipt (RECEIPTS tab) and, when `email` is given, mails the
// client a copy via the Apps Script MailApp action.
export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.STOCK_WRITER_URL;
  const token = process.env.STOCK_WRITER_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "Stock writer not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const client = typeof body.client === "string" ? body.client.trim() : "";
  const amount = parseInt(String(body.amount ?? "").replace(/[^0-9]/g, ""), 10);
  if (!client) {
    return NextResponse.json({ ok: false, error: "client name required" }, { status: 400 });
  }
  if (!(amount > 0)) {
    return NextResponse.json({ ok: false, error: "amount must be a positive number" }, { status: 400 });
  }
  const fields = {
    client,
    phone: String(body.phone || "").slice(0, 30),
    items: String(body.items || "").slice(0, 1500),
    amount: String(amount),
    words: String(body.words || "").slice(0, 200),
    method: String(body.method || "").slice(0, 60),
    balance: String(body.balance || "").slice(0, 40),
    note: String(body.note || "").slice(0, 300),
  };
  const origin = new URL(req.url).origin;
  const call = async (payload: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return res.json().catch(() => ({}));
  };
  try {
    const data = await call({ token, action: "createReceipt", fields });
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.error || "receipt failed" }, { status: 502 });
    }
    const no: string = data.no;
    const key: string = data.key || "";
    const link = `${origin}/receipt/${no}?k=${key}`;
    let emailed = false;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email) {
      // A failed send must not fail the request — the receipt already
      // exists and returning an error would invite a duplicate create.
      try {
        const text = [
          "Petal Steps by Thandiwe Mwaba",
          "Receipt " + no,
          "",
          "Received from: " + fields.client,
          "Sum of: " + (fields.words || "K" + amount.toLocaleString("en-ZM")),
          "Amount: K" + amount.toLocaleString("en-ZM") + (fields.balance ? " · Balance: " + fields.balance : ""),
          "Payment for: " + (fields.items || "—"),
          "Method: " + (fields.method || "—"),
          "",
          "View receipt: " + link,
          "",
          "Thank you for shopping with us 🌸",
          "Block A Shop B, Thompson Park, Munali Rd 4774, Lusaka · +260 76 0732751",
        ].join("\n");
        const sent = await call({
          token,
          action: "sendReceiptEmail",
          email,
          subject: "Your Petal Steps receipt " + no,
          body: text,
        });
        emailed = Boolean(sent.ok);
      } catch {
        emailed = false;
      }
    }
    return NextResponse.json({ ok: true, no, key, emailed });
  } catch {
    return NextResponse.json({ ok: false, error: "writer unreachable" }, { status: 502 });
  }
}
