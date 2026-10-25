import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { createReport } from "@/lib/report";

export async function POST() {
  if ((await currentRole()) !== "parent") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const report = await createReport();
    if (!report) return NextResponse.json({ error: "In den letzten 7 Tagen gab es noch keine Gespräche." }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Der Bericht konnte gerade nicht erstellt werden." }, { status: 502 });
  }
}
