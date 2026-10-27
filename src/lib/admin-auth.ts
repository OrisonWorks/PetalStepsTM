import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "petal_admin";

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE);
}

export function expectedCookieValue(): string {
  return createHmac("sha256", process.env.ADMIN_PASSCODE || "")
    .update("petal-admin-v1")
    .digest("hex");
}

export function passcodeValid(passcode: string): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  const a = Buffer.from(String(passcode));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cookieAuthed(value: string | undefined): boolean {
  if (!process.env.ADMIN_PASSCODE || !value) return false;
  return value === expectedCookieValue();
}
