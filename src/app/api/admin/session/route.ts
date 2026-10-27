import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminConfigured, cookieAuthed } from "@/lib/admin-auth";

export async function GET() {
  const store = await cookies();
  return NextResponse.json({
    configured: adminConfigured(),
    authed: cookieAuthed(store.get(ADMIN_COOKIE)?.value),
  });
}
