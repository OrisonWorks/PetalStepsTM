import { waNumber } from "@/lib/utils";

// WhatsApp Cloud API plumbing — everything is env-gated and the admin UI
// falls back to wa.me links until Meta verification is done and these are
// set on Vercel:
//   WHATSAPP_TOKEN            — permanent system-user access token
//   WHATSAPP_PHONE_NUMBER_ID  — the WABA phone number's ID (not the number)
//   WHATSAPP_VERIFY_TOKEN     — random string we choose; Meta echoes it back
//                               during webhook setup at /api/whatsapp/webhook
const GRAPH = "https://graph.facebook.com/v21.0";

export function waCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function send(to: string, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, error: "not-configured" };
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `Meta ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Meta unreachable: ${err}` };
  }
}

// Free-form text — only delivers inside the 24h customer-service window
// (after the customer last messaged the business). Outside it, use a template.
export function waSendText(recipient: string, body: string) {
  return send(waNumber(recipient), { type: "text", text: { body: body.slice(0, 4096) } });
}

// Pre-approved template — delivers any time. `params` fill the template's
// {{1}}, {{2}}… body placeholders.
export function waSendTemplate(recipient: string, name: string, lang: string, params: string[]) {
  return send(waNumber(recipient), {
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: params.length
        ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text).slice(0, 1024) })) }]
        : [],
    },
  });
}
