// Best-effort throttle for the admin login endpoint. In-memory, so the limit
// applies per server instance — on serverless each warm instance counts
// separately. Global rather than per-IP: there is a single admin, and a global
// counter can't be bypassed by spoofing forwarded-IP headers. Trade-off: an
// attacker can lock out the real admin for up to WINDOW_MS; accepted because
// brute-force resistance matters more for this endpoint.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

let failures = { count: 0, resetAt: 0 };

export function loginRateLimited(): boolean {
  return failures.count >= MAX_FAILURES && Date.now() < failures.resetAt;
}

export function recordLoginFailure(): void {
  const now = Date.now();
  if (now > failures.resetAt) {
    failures = { count: 1, resetAt: now + WINDOW_MS };
  } else {
    failures.count += 1;
  }
}

export function clearLoginFailures(): void {
  failures = { count: 0, resetAt: 0 };
}
