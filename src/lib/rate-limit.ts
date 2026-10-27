// Best-effort per-IP rate limiter for the admin login endpoint. In-memory, so
// limits apply per server instance (on serverless each warm instance counts
// separately) — slows brute force without needing external storage.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

const attempts = new Map<string, { count: number; resetAt: number }>();

function key(req: Request): string {
  // x-vercel-forwarded-for is set by the platform from observed connections and
  // can't be spoofed by a client-supplied XFF. Otherwise take the rightmost XFF
  // entry (the IP appended by the edge), never the client-controlled first one.
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.[xff.length - 1] || req.headers.get("x-real-ip") || "unknown";
}

export function loginRateLimited(req: Request): boolean {
  const rec = attempts.get(key(req));
  return !!rec && rec.count >= MAX_FAILURES && Date.now() < rec.resetAt;
}

export function recordLoginFailure(req: Request): void {
  const k = key(req);
  const now = Date.now();
  const rec = attempts.get(k);
  if (!rec || now > rec.resetAt) {
    attempts.set(k, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

export function clearLoginFailures(req: Request): void {
  attempts.delete(key(req));
}
