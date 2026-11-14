import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieAuthed } from "@/lib/admin-auth";

const defaultModel = "naver-clova-ix/donut-base-finetuned-cord-v2";

export async function POST(req: Request) {
  const store = await cookies();
  if (!cookieAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "OCR is not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const mime = String(body.mime || "");
  const encoded = String(body.data || "");
  if (!/^image\/(png|jpe?g|webp)$/.test(mime) || !encoded) {
    return NextResponse.json({ ok: false, error: "Valid receipt image required" }, { status: 400 });
  }
  if (encoded.length > 4.5 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Image too large" }, { status: 400 });
  }
  const model = process.env.HUGGINGFACE_OCR_MODEL || defaultModel;
  const endpoint = process.env.HUGGINGFACE_OCR_URL || `https://api-inference.huggingface.co/models/${model}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": mime },
      body: Buffer.from(encoded, "base64"),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: result.error || "OCR provider error" }, { status: 502 });
    }
    const text = Array.isArray(result)
      ? result.map((item) => item?.generated_text || item?.text || "").filter(Boolean).join("\n")
      : String(result.generated_text || result.text || "");
    return NextResponse.json({
      ok: true,
      model,
      text,
      warning: "OCR is a draft only. Confirm every value against the physical receipt before registering it.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "OCR provider unreachable" }, { status: 502 });
  }
}
