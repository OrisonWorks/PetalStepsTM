// Best-effort throttle for the admin login endpoint. In-memory, so the limit
// applies per server instance — on serverless each warm instance counts
// separately. Global rather than per-IP: there is a single admin, and a global
// counter can't be bypassed by spoofing forwarded-IP headers. Trade-off: an
// attacker can lock out the real admin for up to WINDOW_MS; accepted because
// brute-force resistance matters more for this endpoint.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

let attempts = { count: 0, resetAt: 0 };

// Counts a login attempt and reports whether it may proceed. Must be called
// BEFORE the first await in the route: the increment is synchronous, so
// concurrent requests can't all pass a check-then-record race.
export function loginAttemptAllowed(): boolean {
  const now = Date.now();
  if (now > attempts.resetAt) attempts = { count: 0, resetAt: now + WINDOW_MS };
  attempts.count += 1;
  return attempts.count <= MAX_ATTEMPTS;
}

export function clearLoginAttempts(): void {
  attempts = { count: 0, resetAt: 0 };
}

// Public newsletter endpoint: global cap (60/hour). Global rather than
// per-IP — forwarded headers are spoofable, and subscription volume on a
// small shop is low enough that a shared ceiling is fine.
const SUB_WINDOW_MS = 60 * 60 * 1000;
const SUB_MAX = 60;
let subs = { count: 0, resetAt: 0 };

export function subscribeAllowed(): boolean {
  const now = Date.now();
  if (now > subs.resetAt) subs = { count: 0, resetAt: now + SUB_WINDOW_MS };
  subs.count += 1;
  return subs.count <= SUB_MAX;
}
