import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Markiert alle Hinweise als gesehen.
export async function POST() {
  if ((await currentRole()) !== "parent") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  getDb().prepare("UPDATE safety_events SET seen = 1 WHERE seen = 0").run();
  return NextResponse.json({ ok: true });
}
