import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Nur das Kind sieht seine eigenen Gespräche. Der Elternbereich bekommt bewusst keinen Zugriff.
export async function GET() {
  if ((await currentRole()) !== "kid") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const rows = getDb()
    .prepare("SELECT id, mode, title, created_at AS createdAt FROM conversations ORDER BY id DESC LIMIT 30")
    .all();
  return NextResponse.json({ conversations: rows });
}
