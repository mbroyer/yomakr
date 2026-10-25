import crypto from "node:crypto";
import { cookies } from "next/headers";

export type Role = "kid" | "parent";

export const SESSION_COOKIE = "yomakr_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET fehlt oder ist zu kurz (mindestens 16 Zeichen).");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(role: Role, now = Date.now()): string {
  const payload = `${role}.${now + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): Role | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expires, signature] = parts;
  if (role !== "kid" && role !== "parent") return null;
  const expected = sign(`${role}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(expires) < now) return null;
  return role;
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Prüft PIN bzw. Passwort und liefert die passende Rolle. */
export function checkCredentials(role: Role, secretInput: string): boolean {
  const expected = role === "kid" ? process.env.KID_PIN : process.env.PARENT_PASSWORD;
  if (!expected) return false;
  return safeEqual(secretInput, expected);
}

export async function currentRole(): Promise<Role | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
