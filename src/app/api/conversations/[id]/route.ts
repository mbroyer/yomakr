import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadHistory } from "@/lib/chat";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await currentRole()) !== "kid") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const id = Number((await params).id);
  const conversation = getDb().prepare("SELECT id, mode, title FROM conversations WHERE id = ?").get(id);
  if (!conversation) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json({ conversation, messages: loadHistory(id) });
}
