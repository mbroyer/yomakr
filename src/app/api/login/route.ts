import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, SESSION_COOKIE, sessionCookieOptions, type Role } from "@/lib/auth";

// Einfacher Schutz gegen Durchprobieren der PIN: 5 Fehlversuche, dann 10 Minuten Sperre.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { role?: Role; secret?: string };
  const role = body.role === "parent" ? "parent" : "kid";
  const key = `${role}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "lokal"}`;

  const entry = failures.get(key);
  if (entry && entry.until > Date.now()) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte warte 10 Minuten." }, { status: 429 });
  }

  if (!checkCredentials(role, String(body.secret ?? ""))) {
    const count = (entry?.count ?? 0) + 1;
    failures.set(key, { count, until: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
    return NextResponse.json({ error: role === "kid" ? "Die PIN stimmt nicht." : "Das Passwort stimmt nicht." }, { status: 401 });
  }

  failures.delete(key);
  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, createSessionToken(role), sessionCookieOptions);
  return response;
}
